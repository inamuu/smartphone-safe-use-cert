"""Build the GitHub Pages entry point. Python standard library only."""
import base64
import json
import re
from pathlib import Path
root = Path(__file__).parent
source = (root / 'index.template.html').read_text()
lessons = json.loads((root / 'lessons.json').read_text())
chapter_two = json.loads((root / 'chapter2.json').read_text())
for lesson in lessons + chapter_two['lessons']:
    image_path = lesson['image']
    if not re.fullmatch(r'assets/lessons/[0-9]{2,3}-[a-z-]+\.jpg', image_path):
        raise SystemExit(f'Invalid lesson asset path: {image_path}')
    if not (root / image_path).is_file():
        raise SystemExit(f'Missing lesson image: {image_path}')
image_file = root / 'lesson-family.jpg'
if image_file.exists():
    image = base64.b64encode(image_file.read_bytes()).decode()
else:
    match = re.search(r"data:image/jpeg;base64,([A-Za-z0-9+/=]+)", (root / 'index.html').read_text())
    if not match:
        raise SystemExit('No embedded homepage image found in index.html')
    image = match.group(1)
assert source.count('__HERO__') == 1
assert source.count('__LESSONS__') == 1
lesson_json = json.dumps(lessons, ensure_ascii=False, separators=(',', ':')).replace('<', r'\u003c')
chapter_json = json.dumps(chapter_two, ensure_ascii=False, separators=(',', ':')).replace('<', r'\u003c')
source = source.replace('__CHAPTER_TWO__', chapter_json)
output = source.replace('__HERO__', 'data:image/jpeg;base64,' + image).replace('__LESSONS__', lesson_json)
(root / 'index.html').write_text(output)
print(f'Built index.html with {len(lessons)} illustrated lessons')
