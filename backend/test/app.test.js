import assert from 'node:assert/strict';
import test from 'node:test';
import {createApp} from '../src/app.js';
async function withServer(app,callback){const server=app.listen();try{return await callback(server.address().port);}finally{await new Promise((resolve)=>server.close(resolve));}}
test('liveness health endpoint returns ok',async()=>withServer(createApp({db:{query:async()=>[[{healthy:1}]]}}),async(port)=>{const response=await fetch(`http://127.0.0.1:${port}/health`);assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'ok'});}));
test('readiness endpoint checks database',async()=>{let called=false;await withServer(createApp({db:{query:async()=>{called=true;return [[{healthy:1}]];}}}),async(port)=>{const response=await fetch(`http://127.0.0.1:${port}/api/v1/health`);assert.equal(response.status,200);});assert.equal(called,true);});
