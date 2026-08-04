#!/usr/bin/env python3
"""Baut das Upload-Paket fuer den Chrome Web Store (dist/tubeless-chrome.zip).

Der Store nimmt KEIN .crx an — das ist ein ZIP mit vorangestelltem
Signatur-Header und schlaegt beim Upload als "ungueltiges Paket" fehl.
Hochgeladen wird ein gewoehnliches ZIP mit manifest.json im Stammverzeichnis;
signiert wird store-seitig. Das .crx in dist/ bleibt fuers Archiv.
"""
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAYLOAD = ['manifest.json', '_locales', 'src', 'popup', 'icons',
           'README.md', 'LICENSE']


def main():
    out = os.path.join(ROOT, 'dist', 'tubeless-chrome.zip')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for entry in PAYLOAD:
            path = os.path.join(ROOT, entry)
            if os.path.isdir(path):
                for base, _dirs, files in os.walk(path):
                    for name in sorted(files):
                        full = os.path.join(base, name)
                        z.write(full, os.path.relpath(full, ROOT))
            else:
                z.write(path, entry)

    import json
    with zipfile.ZipFile(out) as z:
        manifest = json.loads(z.read('manifest.json'))
        assert 'manifest.json' in z.namelist(), 'manifest nicht im Stamm!'
    print(f'{out}')
    print(f'  Version {manifest["version"]}, {len(zipfile.ZipFile(out).namelist())} Dateien')


if __name__ == '__main__':
    main()
