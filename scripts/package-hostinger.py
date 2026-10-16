"""Create a credential-free Hostinger upload with prebuilt Vue assets."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parent.parent
if not (root / 'frontend/dist/index.html').is_file():
    raise SystemExit('Build first: npm run build')
output = root / 'artifacts/toolmavo-hostinger.zip'
output.parent.mkdir(exist_ok=True)
paths = [
    'package.json', 'package-lock.json', '.env.example', 'README.md',
    'docs', 'scripts', 'design', 'server', 'frontend/package.json',
    'frontend/package-lock.json', 'frontend/index.html', 'frontend/vite.config.js',
    'frontend/playwright.config.js', 'frontend/e2e', 'frontend/src',
    'frontend/public', 'frontend/dist',
]
files = {}
for name in paths:
    target = root / name
    for file in sorted(target.rglob('*')) if target.is_dir() else [target]:
        if file.is_file():
            relative = file.relative_to(root).as_posix()
            files[relative] = file
hashes = {name: sha256(file.read_bytes()).hexdigest() for name, file in sorted(files.items())}
runtime = {name: digest for name, digest in hashes.items()
           if name in ['package.json', 'package-lock.json']
           or name.startswith('frontend/dist/')
           or (name.startswith('server/') and '/test/' not in name)}
manifest = {
    'application': 'ToolMavo',
    'version': json.loads((root / 'package.json').read_text())['version'],
    'createdAt': datetime.now(timezone.utc).isoformat(),
    'node': '24 recommended; 22.13+ minimum',
    'startupFile': 'server/index.js',
    'installCommand': 'npm ci',
    'buildCommand': 'npm run build',
    'startCommand': 'npm start',
    'languages': ['en', 'de', 'ur'],
    'requiredEnvironmentVariables': ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'],
    'runtimeFingerprint': sha256(json.dumps(runtime, sort_keys=True).encode()).hexdigest(),
    'sha256': hashes,
}
temporary = output.with_suffix('.tmp.zip')
with ZipFile(temporary, 'w', ZIP_DEFLATED) as archive:
    for name, file in sorted(files.items()):
        archive.write(file, name)
    archive.writestr('DEPLOYMENT-MANIFEST.json', json.dumps(manifest, indent=2) + '\n')
temporary.replace(output)
checksum = sha256(output.read_bytes()).hexdigest()
output.with_suffix('.zip.sha256').write_text(f'{checksum}  {output.name}\n')
print(output)
print(f'Runtime fingerprint: {manifest["runtimeFingerprint"]}')
