"""Build the GitHub Pages entry point using only the Python standard library."""
import base64
import json
import re
from pathlib import Path

root = Path(__file__).parent
source = (root / 'index.template.html').read_text()
first_lessons = json.loads((root / 'lessons.json').read_text())
published = json.loads((root / 'published.json').read_text())
if published != list(range(1, max(published) + 1)):
    raise SystemExit('Published chapters must be consecutive, starting at chapter 1')
chapters = [{
    'number': 1, 'title': 'スマホを持つ目的と責任',
    'description': '便利さを楽しむための、はじめの約束。',
}]
for number in published[1:]:
    chapter = json.loads((root / f'chapter{number}.json').read_text())
    chapter['number'] = number
    if number == 2:
        chapter.setdefault('title', 'インターネットの仕組み')
        chapter.setdefault('description', '情報が届く仕組みを知って、安全な行動につなげよう。')
    if not chapter.get('title') or not chapter.get('description'):
        raise SystemExit(f'Chapter {number}: missing chapter metadata')
    lessons = chapter['lessons']
    questions = chapter['questions']
    if len(lessons) != 8 or sum('check' in s for s in lessons) != 3:
        raise SystemExit(f'Chapter {number}: expected 8 lessons and 3 checks')
    if len(questions) != 16 or sum(bool(q.get('critical')) for q in questions) != 1:
        raise SystemExit(f'Chapter {number}: expected 16 questions and one critical question')
    if len({q['id'] for q in questions}) != len(questions):
        raise SystemExit(f'Chapter {number}: duplicate question ids')
    for question in questions:
        if len(question['options']) != 3 or not 0 <= question['answer'] < 3 or not 0 <= question['slide'] < 8:
            raise SystemExit(f'Chapter {number}: invalid question')
    if set(q['slide'] for q in questions) != set(range(8)):
        raise SystemExit(f'Chapter {number}: not every lesson has a question')
    chapters.append(chapter)

for chapter in chapters:
    lessons = chapter.get('lessons', first_lessons)
    for lesson in lessons:
        image_path = lesson['image']
        if not re.fullmatch(r'assets/lessons/(?:[0-9]{2,3}-[a-z-]+|chapter[0-9]{2}-atlas)\.jpg', image_path):
            raise SystemExit(f'Invalid lesson asset path: {image_path}')
        if not (root / image_path).is_file():
            raise SystemExit(f'Missing lesson image: {image_path}')
        if 'imagePanel' in lesson and (type(lesson['imagePanel']) is not int or not 0 <= lesson['imagePanel'] < 8):
            raise SystemExit(f'Invalid image panel: {image_path}')
        if 'check' in lesson:
            check = lesson['check']
            if len(check['options']) != 3 or not 0 <= check['answer'] < 3:
                raise SystemExit('Invalid lesson check')
    for citation in chapter.get('sources', []):
        if not citation['url'].startswith('https://'):
            raise SystemExit('Only HTTPS source links are allowed')

image_file = root / 'lesson-family.jpg'
if image_file.exists():
    image = base64.b64encode(image_file.read_bytes()).decode()
else:
    match = re.search(r'data:image/jpeg;base64,([A-Za-z0-9+/=]+)', (root / 'index.html').read_text())
    if not match:
        raise SystemExit('No embedded homepage image found in index.html')
    image = match.group(1)

def embedded_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<', r'\u003c')

values = {'__HERO__': 'data:image/jpeg;base64,' + image,
          '__LESSONS__': embedded_json(first_lessons), '__CHAPTERS__': embedded_json(chapters)}
for placeholder, value in values.items():
    if source.count(placeholder) != 1:
        raise SystemExit(f'Expected exactly one {placeholder}')
    source = source.replace(placeholder, value)
(root / 'index.html').write_text(source)
print(f'Built index.html: {len(chapters)} chapters, {len(chapters) * 8} illustrated lessons')
