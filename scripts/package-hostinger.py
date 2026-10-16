from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
if not (root / 'frontend/dist/index.html').exists():
    raise SystemExit('Build first: npm run build')
output = root / 'artifacts/toolmavo-hostinger.zip'
output.parent.mkdir(exist_ok=True)
paths = ['package.json', 'package-lock.json', '.env.example', 'README.md', 'docs', 'scripts', 'design',
         'server', 'frontend/package.json', 'frontend/package-lock.json', 'frontend/index.html',
         'frontend/vite.config.js', 'frontend/src', 'frontend/public', 'frontend/dist']
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in paths:
        target = root / name
        for file in sorted(target.rglob('*')) if target.is_dir() else [target]:
            if file.is_file():
                archive.write(file, str(file.relative_to(root)))
print(output)
