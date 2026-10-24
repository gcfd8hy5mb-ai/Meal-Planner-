import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../luxury-v2/live.js',import.meta.url),'utf8');
const start=source.indexOf('const refreshKroger=async()=>');
const end=source.indexOf('const optionalToggle=',start);
assert.ok(start>=0&&end>start);
const handlers=source.slice(start,end);

function deferred(){
 let resolve,reject;
 const promise=new Promise((a,b)=>{resolve=a;reject=b});
 return {promise,resolve,reject};
}
function makeHarness(){
 const requests=[];
 const user={uid:'A'};
 const auth={currentUser:user};
 const status={textContent:''};
 const connect={disabled:false};
 const disconnect={disabled:false};
 const script=`
 let krogerEpoch=0,krogerActionEpoch=0,krogerActionPending=false,krogerKnownConnected=false;
 const krogerStatus=globalThis.status,krogerConnectButton=globalThis.connect,krogerDisconnectButton=globalThis.disconnect;
 const krogerDisplay=(message,connected=false)=>{krogerKnownConnected=connected;krogerStatus.textContent=message;};
 `+handlers+`
 globalThis.beginStatus=()=>refreshKroger();
 globalThis.resetSession=()=>{++krogerEpoch;++krogerActionEpoch;krogerActionPending=false;krogerKnownConnected=false};
 globalThis.readState=()=>({epoch:krogerEpoch,pending:krogerActionPending});
 `;
 const context={status,connect,disconnect,auth,Date,document:{visibilityState:'visible',addEventListener(){}},
   window:{addEventListener(){},location:{assign(url){context.redirect=url}}},
   krogerRequest(_user,path){const d=deferred();requests.push({path,deferred:d});return d.promise}};
 vm.runInNewContext(script,context);
 return {context,requests,status,connect,disconnect,auth};
}
async function settle(){await Promise.resolve();await Promise.resolve();}

test('older status success cannot overwrite a newer Kroger Connect',async()=>{
 const h=makeHarness();
 const check=h.context.beginStatus();assert.equal(h.requests[0].path,'/status');
 const connect=h.connect.onclick();assert.equal(h.requests[1].path,'/connect');
 h.requests[0].deferred.resolve({connected:false});await check;
 assert.equal(h.status.textContent,'Opening Kroger sign-in…');
 h.requests[1].deferred.resolve({authorizationUrl:'https://api.kroger.com/example'});await connect;
 assert.equal(h.context.redirect,'https://api.kroger.com/example');
});
test('older status success cannot overwrite a newer Kroger Disconnect',async()=>{
 const h=makeHarness();
 const check=h.context.beginStatus();
 const disconnect=h.disconnect.onclick();
 h.requests[0].deferred.resolve({connected:true});await check;
 assert.equal(h.status.textContent,'Disconnecting Kroger…');
 h.requests[1].deferred.resolve({});await disconnect;
 assert.equal(h.status.textContent,'Kroger disconnected. Your grocery list is unchanged.');
});
test('A to B to A session reset rejects delayed connect result even with same UID',async()=>{
 const h=makeHarness();
 const connect=h.connect.onclick();
 h.auth.currentUser={uid:'B'};h.context.resetSession();
 h.auth.currentUser={uid:'A'};h.context.resetSession();
 h.requests[0].deferred.resolve({authorizationUrl:'https://api.kroger.com/stale'});await connect;
 assert.equal(h.context.redirect,undefined);
 assert.equal(h.context.readState().pending,false);
});
test('starting an action invalidates any older connection status epoch',()=>{
 const connect=handlers.slice(handlers.indexOf('krogerConnectButton.onclick='),handlers.indexOf('krogerDisconnectButton.onclick='));
 const disconnect=handlers.slice(handlers.indexOf('krogerDisconnectButton.onclick='));
 for(const handler of [connect,disconnect])assert.match(handler,/const epoch=\+\+krogerEpoch/);
});
