"""Replace the 33 rejected original photo mappings with reviewed local images."""
import hashlib
import json
import re
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
html_path = root / 'index.html'
html = html_path.read_text()
match = re.search(r'const verifiedRecipePhotos=(\{[^;]+\});', html)
assert match
photos = json.loads(match[1])
audit_path = root / 'docs/original-meal-photo-audit.json'
audit = json.loads(audit_path.read_text())
inventory = json.loads((root / 'docs/meal-photo-prompts/catalog.json').read_text())
assert len(audit) == 41 and len(inventory) == 125
assert all(item['status'] == 'accepted' for item in inventory)

hashes = set()
for item in inventory:
    asset = root / item['asset']
    with Image.open(asset) as im:
        assert im.format == 'WEBP' and im.size == (960, 640)
        im.load()
    assert asset.stat().st_size < 150 * 1024
    digest = hashlib.sha256(asset.read_bytes()).hexdigest()
    assert digest not in hashes, f'Duplicate asset: {item["id"]}'
    hashes.add(digest)
    assert photos[item['id']] == item['asset']

for item in audit:
    if item['visualVerdict'] == 'pass':
        assert photos[item['id']] == item['url']
        continue
    asset_name = f'assets/meal-photos/{item["id"]}.webp'
    asset = root / asset_name
    with Image.open(asset) as im:
        assert im.format == 'WEBP' and im.size == (960, 640)
        im.load()
    assert asset.stat().st_size < 150 * 1024
    digest = hashlib.sha256(asset.read_bytes()).hexdigest()
    assert digest not in hashes, f'Duplicate asset: {item["id"]}'
    hashes.add(digest)
    photos[item['id']] = asset_name
    item['replacementAsset'] = asset_name
    item['replacementReview'] = 'Accepted after visual review against the current recipe ingredients.'

assert len(photos) == 166 and len(set(photos.values())) == 166
html = html[:match.start(1)] + json.dumps(photos, separators=(',', ':')) + html[match.end(1):]
html_path.write_text(html)
audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')

report = root / 'docs/meal-photo-coverage.md'
report.write_text('''# Tablewise meal image coverage

All 166 built-in recipes have distinct, accurately matched photo mappings: 125 accepted generated catalog images, 33 replacement images for rejected original links, and eight retained original images that passed visual review and URL checks.

The 158 local images are 960 × 640 WebP, each under 150 KiB. Original visual findings and replacement paths are recorded in [original-meal-photo-audit.json](original-meal-photo-audit.json). Recipe IDs, asset hashes, image decoding, dimensions, URL response types, and mapping coverage are checked by tests.

| Batch | Accepted | Total |
|---|---:|---:|
| 1 | 25 | 25 |
| 2 | 25 | 25 |
| 3 | 25 | 25 |
| 4 | 25 | 25 |
| 5 | 25 | 25 |
| Original replacements | 33 | 33 |
| Original approved links | 8 | 8 |

The original 41 URL decisions are documented in [original-meal-photo-audit.md](original-meal-photo-audit.md). All prior accepted images and mappings are retained.
''')
print('Final audit: 166/166 mapped; 158 local WebP images, 8 approved external photographs.')
