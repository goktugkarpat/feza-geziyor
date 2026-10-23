#!/usr/bin/env python3
"""tools/update-cache.cjs ile aynı işi yapar (node çalışmayan Mac için): sw.js CORE listesi + içerik sürümü.
Çalıştır: python3 tools/update-cache.py"""
import hashlib, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SW = ROOT / "sw.js"
base = ['index.html', 'manifest.webmanifest', 'icon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'vendor/three.js']
source = sorted('src/' + p.name for p in (ROOT / 'src').iterdir() if p.suffix in ('.js', '.css'))
if (ROOT / 'src' / 'ulke').exists():
    source += sorted('src/ulke/' + p.name for p in (ROOT / 'src' / 'ulke').iterdir() if p.suffix == '.js')
assets = []
for d in ['voice', 'ui', 'music', 'sfx']:
    dd = ROOT / 'assets' / d
    if dd.exists():
        assets += sorted('assets/%s/%s' % (d, p.name) for p in dd.iterdir() if re.search(r'\.(mp3|m4a|ogg|wav|json|png)$', p.name))
files = base + source + assets
sw = SW.read_text(encoding='utf-8')
sw = re.sub(r"const CORE = \[[\s\S]*?\];", lambda m: "const CORE = [\n" + ",\n".join("  '%s'" % f for f in files) + "\n];", sw, count=1)
h = hashlib.sha256()
h.update(re.sub(r"const CACHE = PREFIX \+ '[^']+';", "const CACHE = PREFIX + 'VERSION';", sw).encode('utf-8'))
for f in files:
    h.update((f + '\0').encode('utf-8')); h.update((ROOT / f).read_bytes())
version = 'v4-' + h.hexdigest()[:12]
sw = re.sub(r"const CACHE = PREFIX \+ '[^']+';", "const CACHE = PREFIX + '%s';" % version, sw, count=1)
SW.write_text(sw, encoding='utf-8')
print('%d local files in offline cache (%s).' % (len(files), version))
