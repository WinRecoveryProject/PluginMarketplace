import test from 'node:test';
import assert from 'node:assert/strict';
import {route} from '../src/registry.mjs';

test('mentioning Desktop preserves explicit plugin authoring and evaluation workflows',async()=>{
 for(const [request,expected]of [['Vurder dette Desktop-plugin','studio-quality'],['Byg et Desktop-plugin','studio-build'],['Update a Desktop plugin','studio-build']])
  assert.equal((await route(request)).selected,expected,request);
});
