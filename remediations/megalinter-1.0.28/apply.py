"""Apply a reviewed, exact-source patch without executing the target or networking."""
import argparse,datetime,hashlib,json,os,stat,tempfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
def digest(data):return hashlib.sha256(data).hexdigest()
def checked(root,relative):
    parts=Path(relative).parts
    if not parts or Path(relative).is_absolute() or any(p in {'.','..'} or ':' in p or '\\' in p for p in parts):raise ValueError('Unsafe patch path')
    current=root
    for part in ('',*parts):
        if part:current=current/part
        st=current.lstat()
        if stat.S_ISLNK(st.st_mode) or getattr(st,'st_file_attributes',0)&1024:raise ValueError('Link/reparse path rejected')
    if not current.is_file():raise ValueError('Expected regular file')
    return current

def atomic(path,data):
    fd,name=tempfile.mkstemp(prefix='.wrp-patch-',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as stream:stream.write(data);stream.flush();os.fsync(stream.fileno())
        os.replace(name,path)
    finally:
        if os.path.exists(name):os.unlink(name)

def prepare(root,patch):
    pending=[];states=[]
    for item in patch['files']:
        path=checked(root,item['path']);before=path.read_bytes();sha=digest(before)
        if sha==item['afterSha256']:states.append('after');continue
        if sha!=item['beforeSha256']:raise ValueError('Source drift: '+item['path'])
        states.append('before');after=before;last=len(before)+1
        for edit in item['operations']:
            start,end=edit['start'],edit['end']
            if not 0<=start<=end<last:raise ValueError('Invalid/overlapping patch ranges')
            if digest(before[start:end])!=edit['oldSha256']:raise ValueError('Segment mismatch')
            after=after[:start]+edit['replacement'].encode('utf-8')+after[end:];last=start
        if digest(after)!=item['afterSha256']:raise ValueError('Unexpected patch output')
        pending.append((path,before,after,item))
    if len(set(states))>1:raise ValueError('Mixed source state; inspect the prior receipt before retrying')
    return pending

def run(root,apply=False,rollback=False):
    root=Path(root).absolute()
    # Do not resolve away a link before the link checks.
    for ancestor in [root,*root.parents]:
        s=ancestor.lstat()
        if stat.S_ISLNK(s.st_mode) or getattr(s,'st_file_attributes',0)&1024:raise ValueError('Linked target root rejected')
    patch=json.loads((HERE/'patchset.json').read_text(encoding='utf-8'))
    # Keep originals outside the scanned/packaged plugin, so old recipes are not active members.
    state=root.parent/'.wrp-remediations'/root.name;backup=state/patch['id'];receipt=backup/'receipt.json'
    for directory in [backup,*backup.parents]:
        if directory.exists() and (directory.is_symlink() or getattr(directory.lstat(),'st_file_attributes',0)&1024):raise ValueError('Linked backup rejected')
    if rollback:
        if not apply:raise ValueError('Rollback requires --apply')
        saved=json.loads(checked(backup,'receipt.json').read_text(encoding='utf-8'))
        if saved['patchsetSha256']!=digest((HERE/'patchset.json').read_bytes()):raise ValueError('Receipt belongs to a different patchset')
        todo=[]
        for item in patch['files']:
            path=checked(root,item['path']);original=checked(backup,'original/'+item['path']).read_bytes()
            if digest(original)!=item['beforeSha256'] or digest(path.read_bytes())!=item['afterSha256']:raise ValueError('Rollback drift; refusing overwrite')
            todo.append((path,original))
        for path,original in todo:atomic(path,original)
        return {'status':'ROLLED_BACK','files':len(todo),'targetExecuted':False,'networkRequests':0}
    pending=prepare(root,patch)
    if not pending:return {'status':'ALREADY_APPLIED','files':len(patch['files']),'targetExecuted':False,'networkRequests':0}
    if not apply:return {'status':'READY','files':len(pending),'resolvedOccurrences':patch['resolvedOccurrences'],'targetExecuted':False,'networkRequests':0}
    if backup.exists():raise ValueError('Existing backup; inspect receipt instead of overwriting')
    backup.mkdir(parents=True)
    for path,before,_,item in pending:
        dest=backup/'original'/item['path'];dest.parent.mkdir(parents=True,exist_ok=True)
        with dest.open('xb') as stream:stream.write(before)
    changed=[]
    try:
        for path,before,after,item in pending:
            if checked(root,item['path']).read_bytes()!=before:raise ValueError('Concurrent source change')
            atomic(path,after);changed.append((path,before,after))
    except Exception:
        for path,before,after in reversed(changed):
            if path.read_bytes()==after:atomic(path,before)
        raise
    result={'status':'APPLIED','id':patch['id'],'files':len(pending),'resolvedOccurrences':patch['resolvedOccurrences'],'patchsetSha256':digest((HERE/'patchset.json').read_bytes()),'appliedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'targetExecuted':False,'networkRequests':0,'upstreamIdentityUnchanged':True,'upstreamVersionUnchanged':True,'backup':'original/'}
    atomic(receipt,(json.dumps(result,indent=2)+'\n').encode())
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('target',type=Path);parser.add_argument('--apply',action='store_true');parser.add_argument('--rollback',action='store_true');args=parser.parse_args()
    print(json.dumps(run(args.target,args.apply,args.rollback),indent=2))
