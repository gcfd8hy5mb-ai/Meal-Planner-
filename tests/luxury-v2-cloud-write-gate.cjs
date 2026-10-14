// Safety gate: the original planner currently replaces its entire user document.
// Until that writer becomes conflict-aware, the luxury UI must not issue cloud writes.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const legacy=fs.readFileSync('index.html','utf8');
const luxury=fs.readFileSync('luxury-v2/live.js','utf8');
const transaction=fs.readFileSync('luxury-v2/save-transaction.mjs','utf8');
const wholeDocumentWriter=/await\s+setDoc\(doc\(db\s*,\s*['"]users['"]\s*,\s*uid\)\s*,\s*\{\.\.\.payload/.test(legacy);
assert.match(transaction,/transaction\.get\(documentRef\)/,'Transaction must read the latest saved document');
assert.match(transaction,/transaction\.update\(documentRef,prepared\.fields\)/,'Transaction must only update guarded fields');
if(wholeDocumentWriter){
  assert.doesNotMatch(luxury, /(?:from\s*['"][^'"]*save-transaction|\brunTransaction\s*\(|\bsetDoc\s*\(|\bupdateDoc\s*\()/,
    'BLOCKED: legacy whole-document writer remains active, luxury UI must not write to cloud');
  console.log('PASS: legacy whole-document writer detected; luxury cloud saving remains blocked');
}else{
  console.log('PASS: legacy whole-document writer signature absent; still require live account-isolation tests before enabling cloud saving');
}
