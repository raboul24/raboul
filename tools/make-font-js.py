"""Wrap each fonts/*.ttf in fonts/<Name>.js so the PDF exporter can lazy-load it via <script> (fetch() is blocked on file://)."""
import base64, glob, os
for p in sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'fonts', '*.ttf'))):
    name = os.path.splitext(os.path.basename(p))[0]
    b64 = base64.b64encode(open(p, 'rb').read()).decode()
    open(p[:-4] + '.js', 'w').write(f'(window.JournalFontData = window.JournalFontData || {{}}).{name} = "{b64}";\n')
    print(name)
