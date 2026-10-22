#!/usr/bin/env node
// Flag questionable USDA candidates. Never auto-approves nutrition values.
import fs from 'node:fs';
const file=process.argv[2]||'ops/recipe-expansion/usda-candidates-consolidated.json';
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const stopwords=new Set(['fresh','raw','dried','dry','cooked','chopped','sliced','whole','plain','unsalted','salted','large','small','baby','ground','regular','organic','and','or','with','the','for','in','of','a','an','paste','sauce','pieces','crumbs','bread','powder']);
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const tokens=s=>norm(s).split(/\s+/).filter(t=>t.length>2&&!stopwords.has(t));
const review=[];
for(const item of data.reviewItems){
 const base=tokens(item.ingredient);
 const candidates=item.candidates||[];
 const flagged=candidates.map(x=>({fdcId:x.fdcId,description:x.description,sharedTokens:base.filter(t=>tokens(x.description).includes(t))}));
 const candidateFound=candidates.length>0;
 const lexicalMatch=base.length>0&&flagged.some(x=>x.sharedTokens.length>0);
 review.push({ingredient:item.ingredient,candidatesReturned:candidates.length,status:!candidateFound?'no-candidates':!lexicalMatch?'manual-identity-review':'manual-review',topCandidate:candidates[0]?.description||null,
   warning:'Lexical checks are only a screening tool; identity, preparation state, nutrition, and edible grams still require review.'});
}
const summary={ingredients:review.length,noCandidates:review.filter(x=>x.status==='no-candidates').length,manualIdentityReview:review.filter(x=>x.status==='manual-identity-review').length,reviewRequired:review.length,approved:0,
 note:'Do not use top result as an automatic food match. All USDA results remain unverified.',items:review};
fs.writeFileSync('ops/recipe-expansion/usda-identity-audit.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({ingredients:summary.ingredients,noCandidates:summary.noCandidates,manualIdentityReview:summary.manualIdentityReview,approved:0,exampleFlags:review.filter(x=>x.status!=='manual-review').slice(0,12).map(x=>({ingredient:x.ingredient,topCandidate:x.topCandidate}))}));
if(summary.ingredients!==294)process.exitCode=1;
