"""Offline regression tests. No target programs or downloaded installers execute."""
import argparse,ast,copy,hashlib,importlib.util,io,json,os,re,shlex,shutil,subprocess,tarfile,tempfile,unittest
from pathlib import Path

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('patch_apply',HERE/'apply.py');patch_apply=importlib.util.module_from_spec(spec);spec.loader.exec_module(patch_apply)
PATCH=json.loads((HERE/'patchset.json').read_text(encoding='utf-8'))
LOCK=json.loads((HERE/'release-assets.lock.json').read_text(encoding='utf-8'))
parser=argparse.ArgumentParser();parser.add_argument('--original',type=Path,required=True);parser.add_argument('--assets',type=Path,required=True);parser.add_argument('--bash',required=True);parser.add_argument('--commands',type=Path,required=True);args,remaining=parser.parse_known_args()
COMMANDS=json.loads(args.commands.read_text(encoding='utf-8'))

class PatchTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix='wrp patch test ');self.root=Path(self.tmp.name)/'source';self.root.mkdir()
        for item in PATCH['files']:
            dest=self.root/item['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(args.original/item['path'],dest)
    def tearDown(self):self.tmp.cleanup()
    def test_thirteen_occurrences_and_complete_preflight(self):
        self.assertEqual(sum(f['resolvedOccurrences'] for f in PATCH['files']),13)
        self.assertEqual(patch_apply.run(self.root)['status'],'READY');self.assertFalse((self.root/'.wrp-remediations').exists())
    def test_apply_idempotence_and_exact_rollback(self):
        result=patch_apply.run(self.root,True);self.assertEqual(result['status'],'APPLIED')
        self.assertEqual(patch_apply.run(self.root,True)['status'],'ALREADY_APPLIED')
        self.assertEqual(patch_apply.run(self.root,True,True)['status'],'ROLLED_BACK')
        for f in PATCH['files']:self.assertEqual(patch_apply.digest((self.root/f['path']).read_bytes()),f['beforeSha256'])
    def test_drift_refuses_all_writes(self):
        file=self.root/PATCH['files'][-1]['path'];file.write_bytes(file.read_bytes()+b'edited')
        before={f['path']:(self.root/f['path']).read_bytes() for f in PATCH['files']}
        with self.assertRaisesRegex(ValueError,'Source drift'):patch_apply.run(self.root,True)
        for f,b in before.items():self.assertEqual((self.root/f).read_bytes(),b)
        self.assertFalse((self.root/'.wrp-remediations').exists())
    def test_rollback_preserves_later_edits(self):
        patch_apply.run(self.root,True);file=self.root/PATCH['files'][0]['path'];file.write_bytes(file.read_bytes()+b'later edit')
        with self.assertRaisesRegex(ValueError,'Rollback drift'):patch_apply.run(self.root,True,True)
        self.assertTrue(file.read_bytes().endswith(b'later edit'))
    def test_path_escape_and_absolute_rejected(self):
        for path in ['../outside','/outside','C:/outside']:
            with self.assertRaises(ValueError):patch_apply.checked(self.root,path)
    def test_links_rejected(self):
        link=self.root/'link'
        if os.name=='nt':
            result=subprocess.run(['cmd','/c','mklink','/J',str(link),str(self.root/'docs')],capture_output=True)
            self.assertEqual(result.returncode,0,result.stderr)
        else:link.symlink_to(self.root/'docs',target_is_directory=True)
        try:
            with self.assertRaisesRegex(ValueError,'Link/reparse'):patch_apply.checked(self.root,'link/llm-provider/llm_provider_ollama.md')
        finally:
            if os.name=='nt':os.rmdir(link)
            else:link.unlink()
    def test_forged_segment_and_output_hash_rejected(self):
        for field in ['oldSha256','afterSha256']:
            patch=copy.deepcopy(PATCH)
            if field=='oldSha256':patch['files'][0]['operations'][0][field]='0'*64
            else:patch['files'][0][field]='0'*64
            with self.assertRaises(ValueError):patch_apply.prepare(self.root,patch)
    def test_cleanup_of_owned_temps_only(self):
        patch_apply.run(self.root,True)
        self.assertFalse(list(self.root.rglob('.wrp-patch-*')))
    def test_all_generated_copies_and_python_generator_are_fixed(self):
        patch_apply.run(self.root,True);count=0
        for item in PATCH['files']:
            text=(self.root/item['path']).read_text(encoding='utf-8')
            self.assertFalse(re.search(r'(?:curl|wget)[^\n]*\|\s*(?:ba)?sh\b',text),item['path'])
            if Path(item['path']).name=='Dockerfile':
                count+=item['derivedOccurrences']
                for line in text.splitlines():
                    if 'sh -eu -c' in line:
                        command=line.strip().removeprefix('RUN ').removeprefix('&& ').removesuffix('\\').rstrip()
                        result=subprocess.run([args.bash,'--noprofile','--norc','-n'],input=command,text=True,capture_output=True)
                        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(count,87)
        tree=ast.parse((self.root/'.automation/build.py').read_text(encoding='utf-8'))
        self.assertTrue(any(isinstance(n,ast.Constant) and isinstance(n.value,str) and COMMANDS['rustup'] in n.value for n in ast.walk(tree)))

class OllamaTests(unittest.TestCase):
    def run_case(self,scenario,arch='x86_64'):
        text=(args.original/'docs/llm-provider/llm_provider_ollama.md').read_bytes()
        item=next(f for f in PATCH['files'] if f['path'].endswith('llm_provider_ollama.md'))
        for edit in item['operations']:text=text[:edit['start']]+edit['replacement'].encode()+text[edit['end']:]
        script=re.search(r'```bash\n(.*?)\n```',text.decode().replace('\r\n','\n'),re.S)[1]
        with tempfile.TemporaryDirectory(prefix='wrp ollama fixture ') as temp:
            root=Path(temp);home=root/'home';home.mkdir();stubs=root/'stubs';stubs.mkdir();events=root/'events'
            archive=root/'fixture.tar.gz'
            with tarfile.open(archive,'w:gz') as tar:
                data=b'non-executable fixture\n';info=tarfile.TarInfo('bin/ollama');info.size=len(data);info.mode=0o644;tar.addfile(info,io.BytesIO(data))
            fixture_sha=hashlib.sha256(archive.read_bytes()).hexdigest()
            # Transport-only fixture: substitute its hash; this is NOT a real Ollama install.
            for a in LOCK['ollama']['assets'][:2]:script=script.replace(a['sha256'],fixture_sha)
            def posix(p):
                value=Path(p).absolute().as_posix();return '/'+value[0].lower()+value[2:] if os.name=='nt' else value
            def stub(name,body):
                f=stubs/name;f.write_text('#!/bin/sh\nset -eu\n'+body+'\n',encoding='utf-8',newline='\n');f.chmod(0o755)
            stub('uname','printf "%s\\n" "$WRP_ARCH"')
            stub('curl','printf "download\\n" >> "$WRP_LOG"\n[ "$WRP_SCENARIO" != download_fail ] || exit 22\nwhile [ "$#" -gt 0 ]; do if [ "$1" = -o ]; then shift; output="$1"; fi; shift; done\ncp "$WRP_FIXTURE" "$output"\nif [ "$WRP_SCENARIO" = bad_hash ]; then printf corrupt >> "$output"; fi')
            stub('tar','printf "extract\\n" >> "$WRP_LOG"\n[ "$1" = --zstd ]; shift\n/usr/bin/tar -z "$@"')
            dest=home/'.local/opt'/('ollama-'+LOCK['ollama']['tag'])
            if scenario=='existing':dest.mkdir(parents=True);(dest/'sentinel').write_text('preserve')
            prefix='export PATH='+shlex.quote(posix(stubs)+':/usr/bin:/bin')+'\nexport HOME='+shlex.quote(posix(home))+'\n'
            prefix+='for name in uname curl tar; do case "$(command -v "$name")" in '+shlex.quote(posix(stubs))+'/*) :;; *) exit 99;; esac; done\n'
            file=root/'script.sh';file.write_text(prefix+script+'\n',encoding='utf-8',newline='\n')
            env=dict(os.environ)
            for k in ['BASH_ENV','ENV','CDPATH']:env.pop(k,None)
            env.update(WRP_ARCH=arch,WRP_SCENARIO=scenario,WRP_LOG=posix(events),WRP_FIXTURE=posix(archive))
            result=subprocess.run([args.bash,'--noprofile','--norc',posix(file)],env=env,capture_output=True,text=True,timeout=20)
            log=events.read_text().splitlines() if events.exists() else []
            if scenario=='success':self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(log,['download','extract']);self.assertEqual((dest/'bin/ollama').read_bytes(),b'non-executable fixture\n')
            else:
                self.assertNotEqual(result.returncode,0);self.assertNotIn('extract',log)
                if scenario=='existing':self.assertEqual((dest/'sentinel').read_text(),'preserve');self.assertEqual(log,[])
            if dest.parent.exists():self.assertFalse(list(dest.parent.glob('.ollama-*')))
    def test_success_amd64_fixture(self):self.run_case('success')
    def test_success_arm64_fixture(self):self.run_case('success','aarch64')
    def test_checksum_stops_unpack(self):self.run_case('bad_hash')
    def test_download_failure_stops_unpack(self):self.run_case('download_fail')
    def test_unsupported_architecture_stops_download(self):self.run_case('bad_arch','unsupported')
    def test_existing_version_is_preserved(self):self.run_case('existing')

class RecipeTests(unittest.TestCase):
    def check_recipe(self,tool,scenario,arch='x86_64'):
        command=COMMANDS[tool];base='trivy' if tool=='trivy_sbom' else tool;release=LOCK[base]
        with tempfile.TemporaryDirectory(prefix='wrp recipe tests ') as temp:
            root=Path(temp);stubs=root/'stubs';stubs.mkdir();log=root/'events';tmp=root/'tmp';tmp.mkdir()
            def stub(name,body):
                p=stubs/name;p.write_text('#!/bin/sh\nset -eu\n'+body+'\n',encoding='utf-8',newline='\n');p.chmod(0o755)
            stub('uname','printf "%s\\n" "$WRP_ARCH"')
            stub('curl','printf "download\\n" >> "$WRP_LOG"\n[ "$WRP_SCENARIO" != download_fail ] || exit 22\nurl=""; output=""\nwhile [ "$#" -gt 0 ]; do case "$1" in https://*) url="$1";; -o) shift; output="$1";; esac; shift; done\n[ -n "$output" ]; [ -n "$url" ]\nname="${url##*/}"\nif [ "$name" = rustup-init ]; then case "$url" in *x86_64*) name=rustup-init-x86_64;; *aarch64*) name=rustup-init-aarch64;; *) exit 91;; esac; fi\ncp "$WRP_ASSETS/$name" "$output"\nif [ "$WRP_SCENARIO" = bad_hash ]; then printf corrupt >> "$output"; fi')
            stub('tar','printf "extract\\n" >> "$WRP_LOG"\nif [ "$WRP_SCENARIO" = bad_link ]; then\n  while [ "$#" -gt 0 ]; do case "$1" in -C) shift; dest="$1";; --) shift; member="$1"; break;; esac; shift; done\n  mkdir -p "$(dirname "$dest/$member")"; ln -s /etc/passwd "$dest/$member"\nelse /usr/bin/tar "$@"; fi')
            stub('install','printf "install\\n" >> "$WRP_LOG"\n[ "$1" = -m ]; [ "$2" = 0755 ]; [ -f "$3" ]; [ ! -L "$3" ];\ncase "$4" in /usr/local/bin/golangci-lint|/usr/local/bin/grype|/usr/local/bin/syft|/usr/local/bin/trivy|/usr/local/bin/kingfisher) :;; *) exit 90;; esac')
            stub('chmod','printf "permission\\n" >> "$WRP_LOG"\n[ "$1" = 0755 ]; case "$2" in "$TMPDIR"/*/archive) :;; *) exit 92;; esac\nprintf \'#!/bin/sh\\nprintf "bootstrap\\\\n" >> "$WRP_LOG"\\n[ "$WRP_SCENARIO" != bootstrap_fail ]\\n\' > "$2"\n/bin/chmod 0755 "$2"')
            env=dict(os.environ)
            for key in ['BASH_ENV','ENV','CDPATH']:env.pop(key,None)
            def posix(p):
                value=Path(p).absolute().as_posix()
                return '/'+value[0].lower()+value[2:] if os.name=='nt' else value
            # Export PATH inside the shell, after Git Bash's Windows startup path conversion.
            # Refuse to execute the recipe unless every side-effect tool resolves to a stub.
            prefix='export PATH='+shlex.quote(posix(stubs)+':/usr/bin:/bin')+'\n'
            prefix+='for name in uname curl tar install chmod; do case "$(command -v "$name")" in '+shlex.quote(posix(stubs))+'/*) :;; *) exit 99;; esac; done\n'
            actual_scenario='bad_hash' if scenario=='bad_hash_conditional' else scenario
            body='if '+command+'; then exit 88; else exit 17; fi' if scenario=='bad_hash_conditional' else command
            script=root/'recipe.sh';script.write_text(prefix+body+'\n',encoding='utf-8',newline='\n')
            env.update(TMPDIR=posix(tmp),WRP_LOG=posix(log),WRP_ASSETS=posix(args.assets),WRP_SCENARIO=actual_scenario,WRP_ARCH=arch)
            match=re.search(r'test "\$\{([^}]+)\}" = "([^"]+)"',command);variable=match[1]
            env[variable]='wrong-version' if scenario=='bad_version' else match[2]
            result=subprocess.run([args.bash,'--noprofile','--norc',posix(script)],env=env,capture_output=True,text=True,timeout=60)
            events=log.read_text().splitlines() if log.exists() else []
            if scenario=='success':
                self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(events,['download','permission','bootstrap'] if tool=='rustup' else ['download','extract','install'])
            else:
                self.assertNotEqual(result.returncode,0);self.assertNotIn('install',events)
                if scenario in ['bad_hash','download_fail','bad_hash_conditional']:self.assertEqual(events,['download'])
                if scenario=='bad_hash_conditional':self.assertEqual(result.returncode,17)
                if scenario in ['bad_arch','bad_version']:self.assertEqual(events,[])
            self.assertEqual(list(tmp.iterdir()),[],'Own mktemp directory must be removed even on a failing recipe')

def case(tool,scenario,arch):
    def test(self):self.check_recipe(tool,scenario,arch)
    return test
for tool in COMMANDS:
    for scenario in ['success','bad_hash','bad_hash_conditional','download_fail','bad_version','bad_arch',('bootstrap_fail' if tool=='rustup' else 'bad_link')]:
        arch='not-a-supported-cpu' if scenario=='bad_arch' else 'x86_64'
        setattr(RecipeTests,'test_'+tool+'_'+scenario,case(tool,scenario,arch))
    setattr(RecipeTests,'test_'+tool+'_arm64_success',case(tool,'success','aarch64'))

if __name__=='__main__':unittest.main(argv=[__file__,*remaining])
