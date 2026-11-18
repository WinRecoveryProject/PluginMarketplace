import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from runtime.execution import process_plan, select_environment
from runtime.evidence import ContractError


class ExecutionTests(unittest.TestCase):
    def test_windows_plan_keeps_argv_and_does_not_claim_cpj_or_durability(self):
        request={'platform':'windows','argv':['python','a path/test.py','$(not-code)'],
                 'cwd':'C:/project with spaces','finite':True,'interactive':False}
        result=process_plan(request)
        self.assertEqual(result['backend'],'host-exec-session')
        self.assertEqual(result['argv'],request['argv'])
        for field in ['executed','executionAuthorized','survivesReboot','durabilityVerified','automaticCompletionDeliveryVerified']:
            self.assertFalse(result[field])
        request['lifetime']='detached'
        self.assertEqual(process_plan(request)['backend'],'windows-native-detached')
        request.update(platform='linux',cwd='/repo')
        self.assertEqual(process_plan(request)['backend'],'existing-cpj-posix')

    def test_process_rejects_shell_string_relative_or_interactive_work(self):
        base={'platform':'windows','argv':['python','test.py'],'cwd':'C:/repo','finite':True,'interactive':False}
        for key,value in [('argv','python test.py'),('argv',[]),('argv',[4]),('cwd','relative'),('interactive',True),('finite',False),('platform','guess')]:
            data=copy.deepcopy(base);data[key]=value
            with self.subTest(key=key,value=value),self.assertRaises(ContractError):process_plan(data)

    def test_ready_managed_configuration_and_connected_executor(self):
        cloud={'displayName':'Default environment','status':'ready','canRun':True,'environmentConfigId':'actual-config'}
        native={'displayName':'Computer','status':'connected','environmentId':'actual-executor'}
        original={'data':[cloud,native],'nextCursor':None}
        before=copy.deepcopy(original)
        result=select_environment(original)
        self.assertEqual(result['environment']['environmentConfigId'],'actual-config')
        self.assertFalse(result['canExecute']);self.assertFalse(result['taskCreated'])
        self.assertFalse(result['environment']['costVerified'])
        result=select_environment(original,'computer')
        self.assertEqual(result['environment']['environmentId'],'actual-executor')
        self.assertTrue(result['environment']['requiresRemoteAbsoluteCwd'])
        self.assertEqual(original,before)

    def test_no_offline_unknown_canrun_or_missing_id_selection(self):
        for entry in [{'status':'offline','environmentId':'x'},{'status':'ready','canRun':False,'environmentConfigId':'x'},
                      {'status':'ready','canRun':'true','environmentConfigId':'x'},{'status':'ready','canRun':True},
                      {'status':'unknown','canRun':True,'environmentConfigId':'x'}]:
            self.assertEqual(select_environment({'data':[entry]})['status'],'UNAVAILABLE')

    def test_pagination_empty_pages_and_ambiguous_names(self):
        self.assertEqual(select_environment({'data':[],'nextCursor':'next'})['status'],'INCOMPLETE')
        entry={'displayName':'same','status':'connected','environmentId':'real'}
        with self.assertRaises(ContractError):select_environment({'data':[entry,dict(entry,environmentId='other')]},'same')
        with self.assertRaises(ContractError):select_environment({'data':[None]})
        with self.assertRaises(ContractError):select_environment([])
        with self.assertRaises(ContractError):select_environment({'data':[],'nextCursor':[]})
        with self.assertRaises(ContractError):select_environment({'data':[{'displayName':None}]},'name')

    def test_cli_routing_preserves_ordinary_development_intent(self):
        spec=importlib.util.spec_from_file_location('execution_cli',ROOT/'scripts/devsuite.py')
        cli=importlib.util.module_from_spec(spec);spec.loader.exec_module(cli)
        cases={'Vis Codex Tasks miljøer':'devsuite-tasks','start a remote Codex task':'devsuite-tasks',
               'list my cloud environments':'devsuite-tasks','vis mine cloudmiljøer':'devsuite-tasks',
               'open the Cloud Environment desktop':'devsuite-environment',
               'vis log for baggrundsjob':'devsuite-jobs','resume process job result':'devsuite-jobs',
               'test the Codex Tasks integration code':'devsuite-test',
               'fix the background job parser':'devsuite-implement','review this job launcher patch':'devsuite-review',
               'plan task ownership':'devsuite-planning'}
        for request,owner in cases.items():
            with self.subTest(request=request):self.assertEqual(cli.route(request)['skill'],owner)

    def test_cli_bad_json_containers_are_structured(self):
        with tempfile.TemporaryDirectory() as directory:
            data=Path(directory)/'input.json';data.write_text('[]',encoding='utf-8')
            for command in ['process-plan','task-environment']:
                result=subprocess.run([sys.executable,str(ROOT/'scripts/devsuite.py'),command,str(data)],capture_output=True,text=True,encoding='utf-8')
                self.assertEqual(result.returncode,1)
                self.assertEqual(json.loads(result.stdout)['status'],'ERROR')
                self.assertNotIn('Traceback',result.stderr)

    def test_explicit_execution_keeps_its_task_or_job_workload(self):
        spec=importlib.util.spec_from_file_location('execution_intent_cli',ROOT/'scripts/devsuite.py')
        cli=importlib.util.module_from_spec(spec);spec.loader.exec_module(cli)
        cases={
            'Start a remote Codex task to implement the feature':'devsuite-tasks',
            'Create a Codex Task to fix the login bug':'devsuite-tasks',
            'Please use Codex Tasks to test this project':'devsuite-tasks',
            'Opret en Codex-opgave til at rette loginfejlen':'devsuite-tasks',
            'Start a remote Codex task in the existing environment to implement the feature':'devsuite-tasks',
            'Run the tests as a background job':'devsuite-jobs',
            'Launch a background job to build and test the project':'devsuite-jobs',
            'Kør testene som baggrundsjob':'devsuite-jobs',
            'Kør testene i baggrunden':'devsuite-jobs',
            'Launch a background job from the project directory to build and test':'devsuite-jobs',
            'Start et baggrundsjob på denne computer og test projektet':'devsuite-jobs',
            'Kør et baggrundsjob fra projektmappen med test og build':'devsuite-jobs',
            'Run the unit tests for the Codex Tasks integration code':'devsuite-test',
            'Run the background job launcher tests':'devsuite-test',
            'Run the Codex Tasks integration tests':'devsuite-test',
            'Implement background job support':'devsuite-implement',
        }
        for request,owner in cases.items():
            with self.subTest(request=request):
                result=cli.route(request)
                self.assertEqual(result['skill'],owner)
                self.assertFalse(result['executionAuthorized'])
                self.assertFalse(result['externalActionAuthorized'])

    def test_negated_execution_does_not_select_a_task_or_job(self):
        spec=importlib.util.spec_from_file_location('execution_negation_cli',ROOT/'scripts/devsuite.py')
        cli=importlib.util.module_from_spec(spec);spec.loader.exec_module(cli)
        cases={
            'Do not start a remote task; review this patch':'devsuite-review',
            "Don't create a Codex Task. Test the integration code locally.":'devsuite-test',
            'Start ikke en Codex-opgave; gennemgå koden':'devsuite-review',
            'Kør ikke et baggrundsjob; gennemgå ændringerne':'devsuite-review',
            'Do not start a remote task to implement this':'devsuite',
            'Start a remote Codex task to test the project; do not change files':'devsuite-tasks',
        }
        for request,owner in cases.items():
            with self.subTest(request=request):
                result=cli.route(request)
                self.assertEqual(result['skill'],owner)
                self.assertFalse(result['executionAuthorized'])
                self.assertFalse(result['externalActionAuthorized'])


if __name__=='__main__':unittest.main()
