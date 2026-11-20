#!/usr/bin/env python3
"""Builds MINT_MAN_TUESDAY_THREE_BREAKROOM.html from the untouched MINT_MAN_TUESDAY_LOGIC_REBUILD.html
by appending ONE extra <script> (src/three_breakroom.js). No original line is modified."""
import hashlib, pathlib
root = pathlib.Path(__file__).parent
src = (root / 'MINT_MAN_TUESDAY_LOGIC_REBUILD.html').read_text(encoding='utf-8')
js = (root / 'src' / 'three_breakroom.js').read_text(encoding='utf-8')
assert src.count('</script>') == 1 and src.rstrip().endswith('</body></html>') or '</body>' in src
i = src.rindex('</script>') + len('</script>')
out = src[:i] + '\n<script>\n' + js + '\n</script>' + src[i:]
(root / 'MINT_MAN_TUESDAY_THREE_BREAKROOM.html').write_text(out, encoding='utf-8')
print('built', len(out), 'bytes; original sha256', hashlib.sha256(src.encode()).hexdigest()[:16])
