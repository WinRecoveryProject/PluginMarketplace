"""Stage and prove deterministic local runtime archives. No installs or publication."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT=Path(__file__).resolve().parents[1]
ENGINE=ROOT/'skills/plugin-autopilot/scripts'
ENV={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'}
MEMBERS=['plugin.json','.codex-plugin','package.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md',
         'PRIVACY.md','TERMS.md','SUPPORT.md','AGENTS.md','assets','references','skills','scripts','src','schemas','tools']

def run(*args):
    p=subprocess.run(list(map(str,args)),capture_output=True,text=True,encoding='utf-8',env=ENV)
    if p.returncode:
        raise RuntimeError(p.stdout+p.stderr)
    return json.loads(p.stdout)

def build(out):
    out=out.resolve()
    if out==ROOT or ROOT in out.parents:
        raise ValueError('Output must be outside the candidate root')
    if out.exists():
        raise FileExistsError('Refusing existing output directory')
    out.mkdir(parents=True)
    manifest=json.loads((ROOT/'plugin.json').read_text(encoding='utf-8'))
    with tempfile.TemporaryDirectory(prefix='plugin-skill-studio-package-') as tmp:
        stage=Path(tmp)/'stage';stage.mkdir()
        for rel in MEMBERS:
            source=ROOT/rel;target=stage/rel
            if source.is_dir():
                shutil.copytree(source,target,ignore=shutil.ignore_patterns('__pycache__','*.pyc','*.pyo','.git'))
            elif source.exists():shutil.copy2(source,target)
        validation=run(sys.executable,'-B',ENGINE/'validate_plugin.py',stage,'--json')
        if not validation['ok']:raise ValueError(validation)
        check=run('node',stage/'scripts/studio.mjs','self-check')
        archive=out/f'{manifest["name"]}-{manifest["version"]}.zip'
        first=run(sys.executable,'-B',ENGINE/'package_plugin.py',stage,archive,'--json')
        second=Path(tmp)/'second.zip'
        run(sys.executable,'-B',ENGINE/'package_plugin.py',stage,second,'--json')
        if archive.read_bytes()!=second.read_bytes():raise ValueError('Archive is nondeterministic')
        extraction=Path(tmp)/'extracted'
        with zipfile.ZipFile(archive) as z:
            names=z.namelist()
            assert not any(n.startswith(('tests/','fixtures/','.git/','.github/','.agents/','artifacts/')) for n in names)
            assert not any(n.endswith(('auth.json','.pyc')) for n in names)
            z.extractall(extraction)
        fresh=run(sys.executable,'-B',ENGINE/'validate_plugin.py',extraction,'--json')
        isolated=run('node',extraction/'scripts/studio.mjs','self-check')
        # Static evaluation of a real bundled skill, using only extracted runtime modules.
        sample=run('node',extraction/'scripts/studio.mjs','skill-eval',extraction/'skills/skill-eval')
        for report in (validation,fresh):report.pop('pluginRoot',None)
        report={'package':manifest['name'],'version':manifest['version'],'archive':archive.name,
                'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'bytes':archive.stat().st_size,
                'deterministic':True,'genericValidation':validation,'freshExtractionValidation':fresh,
                'sourceCheck':check,'extractedCheck':isolated,'extractedSkillEval':{'valid':sample['valid'],'readiness':sample['readiness'],'observedUsage':sample['observedUsage']},
                'sourceDependencyRequired':False,'installed':False,'published':False,
                'publicationBlockers':['Verified own website URL','Verified own privacy-policy URL','Verified own terms URL']}
        (out/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (out/'SHA256SUMS').write_text(f'{report["sha256"]}  {archive.name}\n',encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',type=Path,required=True)
    build(parser.parse_args().out)
