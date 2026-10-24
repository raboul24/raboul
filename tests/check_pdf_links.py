"""Checks that every clickable link in the PDFs the tests produced points to a real page.
Needs: pip install pypdf. Exit code 0 = fine (or pypdf missing, so skipped), 1 = broken links found."""
import glob, os, sys
try:
    import pypdf
except ImportError:
    print("SKIP  PDF link check (pip install pypdf to enable)")
    sys.exit(0)

folder = sys.argv[1] if len(sys.argv) > 1 else "."
bad = files = links = 0
for path in sorted(glob.glob(os.path.join(folder, "*.pdf"))):
    reader = pypdf.PdfReader(path)
    page_ids = {p.indirect_reference.idnum for p in reader.pages}
    for page in reader.pages:
        for annot in page.get("/Annots") or []:
            links += 1
            if annot.get_object()["/Dest"][0].idnum not in page_ids:
                bad += 1
    files += 1
print(("FAIL" if bad else "PASS") + f"  PDF links: {files} files, {links} links, {bad} broken")
sys.exit(1 if bad else 0)
