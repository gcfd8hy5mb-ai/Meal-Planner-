import test from 'node:test';
import assert from 'node:assert/strict';
import {krogerRequest} from '../luxury-v2/kroger-connect.mjs';

const user={getIdToken:async()=> 'example-test-token'};
test('Kroger gateway forwards a timeout signal and preserves normal responses',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(_url,options)=>{
   assert.equal(options.method,'GET');
   assert.ok(options.signal instanceof AbortSignal);
   assert.equal(options.signal.aborted,false);
   return {ok:true,json:async()=>({connected:true})};
  };
  assert.deepEqual(await krogerRequest(user,'/status',{timeoutMs:1000}),{connected:true});
 }finally{globalThis.fetch=original}
});

test('Kroger disconnect timeout gives uncertain-outcome warning without retry',async()=>{
 const original=globalThis.fetch;
 let calls=0;
 try{
  globalThis.fetch=async(_url,options)=>{
   calls++;
   return new Promise((resolve,reject)=>{
    options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});
   });
  };
  await assert.rejects(krogerRequest(user,'/disconnect',{method:'POST',timeoutMs:10}),/timed out.*may have completed.*check your Kroger connection/i);
  assert.equal(calls,1);
 }finally{globalThis.fetch=original}
});

test('Kroger gateway retains worker errors without retrying',async()=>{
 const original=globalThis.fetch;
 let calls=0;
 try{
  globalThis.fetch=async()=>{calls++;return {ok:false,json:async()=>({error:'Connection unavailable'})}};
  await assert.rejects(krogerRequest(user,'/status'),/Connection unavailable/);
  assert.equal(calls,1);
 }finally{globalThis.fetch=original}
});
