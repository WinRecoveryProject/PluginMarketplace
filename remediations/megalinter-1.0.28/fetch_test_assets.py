"""Explicitly fetch pinned Linux test assets; never execute/install them."""
import argparse,hashlib,json,os,re,tempfile,urllib.request
from pathlib import Path

HERE=Path(__file__).resolve().parent
def fetch(destination):
    destination.mkdir(parents=True,exist_ok=True)
    if destination.is_symlink() or getattr(destination.lstat(),'st_file_attributes',0)&1024:raise ValueError('Linked destination')
    lock=json.loads((HERE/'release-assets.lock.json').read_text(encoding='utf-8'));results=[]
    for tool,release in lock.items():
        if tool=='ollama':continue  # Multi-GB downloads are not required for these transport regressions.
        for asset in release['assets']:
            name=asset['name']
            if Path(name).name!=name or not re.fullmatch(r'[a-zA-Z0-9_.-]+',name):raise ValueError('Unsafe asset name')
            if not (re.fullmatch(r'https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/releases/download/v[0-9.]+/[A-Za-z0-9_.-]+',asset['url']) or re.fullmatch(r'https://static\.rust-lang\.org/rustup/archive/1\.29\.3/(x86_64|aarch64)-unknown-linux-musl/rustup-init',asset['url'])):raise ValueError('Unpinned URL')
            target=destination/name
            if target.exists():
                if target.is_symlink() or hashlib.sha256(target.read_bytes()).hexdigest()!=asset['sha256']:raise ValueError('Existing file drift')
            else:
                fd,temporary=tempfile.mkstemp(prefix='.wrp-asset-',dir=destination)
                try:
                    count=0;digest=hashlib.sha256()
                    request=urllib.request.Request(asset['url'],headers={'User-Agent':'WinRecoveryProject-verified-artifact-test'})
                    with os.fdopen(fd,'wb') as output,urllib.request.urlopen(request,timeout=45) as response:
                        if not response.url.startswith('https://'):raise ValueError('Insecure redirect')
                        while block:=response.read(1024*1024):
                            count+=len(block)
                            if count>asset['size']:raise ValueError('Oversized asset')
                            digest.update(block);output.write(block)
                    if count!=asset['size'] or digest.hexdigest()!=asset['sha256']:raise ValueError('Integrity mismatch')
                    if target.exists():raise ValueError('Concurrent destination change')
                    os.rename(temporary,target)
                finally:
                    if os.path.exists(temporary):os.unlink(temporary)
            results.append({'tool':tool,'asset':name,'sha256Verified':True})
    return results
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('destination',type=Path);args=parser.parse_args();print(json.dumps(fetch(args.destination),indent=2))
