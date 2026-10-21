// Local maintainer tool: import individual, approved photos into Tablewise draft staging.
// Usage: node ops/recipe-expansion/import-approved-photos.mjs /path/to/photo-directory
// Copy files only; DOES NOT publish or flip photoReady flags.
import {readFileSync,copyFileSync,existsSync,mkdirSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const src=process.argv[2];
if(!src){console.error('Specify an existing photo directory');process.exit(2)}
const manifest=JSON.parse(readFileSync(join(root,'ops/recipe-expansion/batch-01-photo-manifest.json'),'utf8'));
const staged=[];
for(const item of manifest.recipes){
 const source=join(resolve(src),item.id+'.webp');
 if(!existsSync(source))continue;
 const size=statSync(source).size;
 if(size<8000||size>3000000){console.error('Invalid image size:',item.id,size);process.exitCode=1;continue}
 const destination=join(root,item.expectedAsset);
 mkdirSync(resolve(destination,'..'),{recursive:true});
 if(existsSync(destination)){console.error('Already exists; will not overwrite:',item.id);process.exitCode=1;continue}
 copyFileSync(source,destination);
 staged.push(item.id);
}
console.log(JSON.stringify({staged,attempted:manifest.recipes.length,note:'Images copied as unreviewed drafts. Manual visual approval and manifest updates are still required before publication.'}));
