from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
out = root / "lingua-trace-extension.zip"
if out.exists():
    out.unlink()
with ZipFile(out, "w", ZIP_DEFLATED) as zf:
    for path in dist.rglob("*"):
        if path.is_file():
            zf.write(path, path.relative_to(dist))
print(out)
