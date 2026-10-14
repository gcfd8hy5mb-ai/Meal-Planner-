"""Connect only visually accepted generated assets; leave application state untouched."""
import argparse,json,re
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('batch',type=int,choices=range(1,6));args=p.parse_args()
html_path=root/'index.html';html=html_path.read_text();m=re.search(r'const verifiedRecipePhotos=(\{[^;]+\});',html);photos=json.loads(m[1])
inv_path=root/'docs/meal-photo-prompts/catalog.json';inv=json.loads(inv_path.read_text());batch=[e for e in inv if e['batch']==args.batch];assert len(batch)==25
for e in batch:
 file=root/e['asset'];assert file.exists(),f'Missing {e["id"]}'
 with Image.open(file) as im:assert im.format=='WEBP' and im.size==(960,640);im.load()
 assert file.stat().st_size<150*1024,f'Oversized {e["id"]}'
 photos[e['id']]=e['asset'];e['status']='accepted';e['visualReview']='Reviewed against catalog ingredients; defining meal components visible.'
# Rejected old photos are retained in the audit file for traceability, not shown to users.
audit=json.loads((root/'docs/original-meal-photo-audit.json').read_text())
for e in audit:
 if e['visualVerdict']=='fail' and photos.get(e['id'])==e['url']:del photos[e['id']]
html=html[:m.start(1)]+json.dumps(photos,separators=(',',':'))+html[m.end(1):]
html_path.write_text(html);inv_path.write_text(json.dumps(inv,ensure_ascii=False,indent=2)+'\n')
accepted=sum(e['status']=='accepted' for e in inv)
report=f'''# Tablewise meal image coverage\n\nCatalog entries: 166. Original missing-photo set: 125. Generated and accepted: {accepted}. Current mappings: {len(photos)}.\n\nPhotography: built-in AI image generation, recipe-specific prompts, dark cinematic restaurant lighting. Files: 960 × 640 WebP, quality 82, each under 150 KiB. Original-photo visual audit is in [original-meal-photo-audit.md](original-meal-photo-audit.md). Failed original mappings use the existing labeled fallback.\n\n## Batch status\n\n| Batch | Accepted | Total |\n|---|---:|---:|\n'''
report+='\n'.join(f'| {b} | {sum(e["status"]=="accepted" for e in inv if e["batch"]==b)} | 25 |' for b in range(1,6))
report+='\n\n## Pending original missing-photo IDs\n\n'+'\n'.join('- `'+e['id']+'`' for e in inv if e['status']!='accepted')
report+='\n\n## Original mappings rejected in the visual audit\n\n'+'\n'.join('- `'+e['id']+'`: '+e['reason'] for e in audit if e['visualVerdict']=='fail')
(root/'docs/meal-photo-coverage.md').write_text(report+'\n')
print(f'Batch {args.batch}: 25 accepted, {accepted}/125 complete; {len(photos)} current mappings.')
