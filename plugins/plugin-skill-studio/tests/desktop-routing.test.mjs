import test from 'node:test';
import assert from 'node:assert/strict';
import {route} from '../src/registry.mjs';

test('mentioning Desktop preserves explicit plugin authoring and evaluation workflows',async()=>{
 for(const [request,expected]of [['Vurder dette Desktop-plugin','plugin-eval'],['Byg et Desktop-plugin','create-plugin'],['Update a Desktop plugin','update-plugin']])
  assert.equal((await route(request)).selected,expected,request);
});
