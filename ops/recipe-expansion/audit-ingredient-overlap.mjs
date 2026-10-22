#!/usr/bin/env node
// Reproducible comparison of staged recipe ingredient sets against the original built-in catalog.
import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const staged=JSON.parse(fs.readFileSync('ops/recipe-expansion/batch-01-recipe-drafts.json','utf8')).recipes;
const first=html.indexOf('const recipes=['), initialEnd=html.indexOf('];',first);
if(first<0||initialEnd<0)throw Error('Original recipe declaration missing');
const baseText=html.slice(first,initialEnd);
const firstRecipes=[...baseText.matchAll(/\{id:'([^']+)',name:'([^']+)'/g)].map(x=>({id:x[1],name:x[2],ingredients:[]}));
const original=[...firstRecipes];
for(const match of html.matchAll(/recipes\.push\(\.\.\.\[/g)){
 const start=match.index+'recipes.push(...'.length, end=html.indexOf(']);',start);
 if(end<0)throw Error('Unclosed recipe append');
 original.push(...JSON.parse(html.slice(start,end+1)));
}
if(original.length!==166)throw Error('Expected 166 original recipes; found '+original.length);
if(staged.length!==110)throw Error('Expected 110 staged recipes; found '+staged.length);
const simplify=s=>String(s).toLowerCase().replace(/&/g,'and').replace(/\b(boneless|skinless|fresh|raw|dried|large|small|shredded|cooked|chopped|diced|ground|low sodium|baby|refrigerated|frozen)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const terms=s=>new Set(simplify(s).split(' ').filter(x=>x.length>=3));
const sameIngredient=(a,b)=>{
 const aa=terms(a),bb=terms(b);
 if(simplify(a)===simplify(b))return true;
 const common=[...aa].filter(x=>bb.has(x)).length;
 return common>=1&&common/Math.max(aa.size,bb.size)>=0.65;
};
function score(a,b){
 const aa=(a.ingredients||[]).map(x=>x[0]),bb=(b.ingredients||[]).map(x=>x[0]);
 if(!aa.length||!bb.length)return 0;
 let matched=aa.filter(x=>bb.some(y=>sameIngredient(x,y))).length;
 return matched/Math.min(aa.length,bb.length);
}
const report=[];
for(const recipe of staged){
 const similar=original.map(o=>({id:o.id,name:o.name,ingredientOverlap:score(recipe,o)})).filter(x=>x.ingredientOverlap>=0.6).sort((a,b)=>b.ingredientOverlap-a.ingredientOverlap).slice(0,8);
 if(similar.length)report.push({id:recipe.id,name:recipe.name,similar});
}
const out={originalCount:original.length,stagedCount:staged.length,highIngredientOverlapPairs:report.length,manualReviewRequired:report};
fs.writeFileSync('ops/recipe-expansion/ingredient-overlap-report.json',JSON.stringify(out,null,2)+'\n');
console.log('Original catalog: '+original.length+', staged: '+staged.length+', flagged: '+report.length);
if(report.length)console.log('FLAGGED for manual review, not automatic duplicates: '+report.map(x=>x.id).join(', '));
