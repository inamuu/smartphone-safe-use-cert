"""Build a self-contained GitHub Pages entry point using only the standard library."""
import base64
import re
from pathlib import Path
root = Path(__file__).parent
source = (root / 'index.template.html').read_text()
image_file = root / 'lesson-family.jpg'
if image_file.exists():
    image = base64.b64encode(image_file.read_bytes()).decode()
else:
    # The canonical image is tracked inside index.html, avoiding duplicate binaries.
    match = re.search(r"data:image/jpeg;base64,([A-Za-z0-9+/=]+)", (root / 'index.html').read_text())
    if not match:
        raise SystemExit('No embedded lesson image found in index.html')
    image = match.group(1)
assert source.count('__HERO__') == 1
(root / 'index.html').write_text(source.replace('__HERO__', 'data:image/jpeg;base64,' + image))
print('Built index.html with embedded lesson illustration')
