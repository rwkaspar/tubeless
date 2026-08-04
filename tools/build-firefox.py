#!/usr/bin/env python3
"""Baut das Firefox-Paket (dist/tubeless-firefox.xpi).

Quelle ist derselbe Code wie fuer Chrome — nur das Manifest unterscheidet
sich:

- `browser_specific_settings.gecko` kommt dazu. Ohne die feste Add-on-ID
  funktioniert in Firefox-MV3 weder die Installation noch `storage.sync`.
- `strict_min_version: 121.0`, weil src/tubeless.css auf :has() lehnt
  (Firefox aktiviert :has() ab 121; 140 ist die Untergrenze für die
  Datenerhebungs-Erklärung im Manifest).
- `minimum_chrome_version` faellt weg — Chrome-spezifisch, der AMO-Linter
  wuerde es als unbekannten Schluessel anmeckern.

Das erzeugte .xpi ist ein gewoehnliches ZIP: bei addons.mozilla.org
hochladen (AMO signiert selbst), lokal testen ueber
about:debugging#/runtime/this-firefox -> "Temporaeres Add-on laden".
"""
import json
import os
import shutil
import sys
import tempfile
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GECKO_ID = 'tubeless@neotactiq.ai'
MIN_FIREFOX = '140.0'
PAYLOAD = ['manifest.json', '_locales', 'src', 'popup', 'icons',
           'README.md', 'LICENSE']


def firefox_manifest():
    with open(os.path.join(ROOT, 'manifest.json')) as fh:
        manifest = json.load(fh)
    manifest.pop('minimum_chrome_version', None)
    manifest['browser_specific_settings'] = {
        'gecko': {
            'id': GECKO_ID,
            'strict_min_version': MIN_FIREFOX,
            # Firefox' eingebaute Datenerhebungs-Erklärung: Tubeless erhebt
            # nichts. Der opt-in SponsorBlock-Abruf überträgt nur ein anonymes
            # Hash-Präfix an einen Drittanbieter und nichts an uns — das ist
            # keine Erhebung im Sinne dieser Kategorien.
            'data_collection_permissions': {'required': ['none']}
        },
        # Android liest data_collection_permissions erst ab 142
        'gecko_android': {'strict_min_version': '142.0'}
    }
    return manifest


def main():
    out_dir = os.path.join(ROOT, 'dist')
    os.makedirs(out_dir, exist_ok=True)
    xpi = os.path.join(out_dir, 'tubeless-firefox.xpi')

    staging = tempfile.mkdtemp(prefix='tubeless-ff-')
    try:
        for entry in PAYLOAD:
            src = os.path.join(ROOT, entry)
            dst = os.path.join(staging, entry)
            if os.path.isdir(src):
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)
        with open(os.path.join(staging, 'manifest.json'), 'w') as fh:
            json.dump(firefox_manifest(), fh, indent=2, ensure_ascii=False)
            fh.write('\n')

        with zipfile.ZipFile(xpi, 'w', zipfile.ZIP_DEFLATED) as z:
            for base, _dirs, files in os.walk(staging):
                for name in sorted(files):
                    path = os.path.join(base, name)
                    z.write(path, os.path.relpath(path, staging))

        manifest = firefox_manifest()
        print(f'{xpi}')
        print(f'  Version {manifest["version"]}, Gecko-ID {GECKO_ID}, '
              f'Firefox >= {MIN_FIREFOX}')
        # Staging-Verzeichnis optional stehen lassen (fuer addons-linter)
        if '--keep-staging' in sys.argv:
            keep = os.path.join(out_dir, 'firefox-staging')
            shutil.rmtree(keep, ignore_errors=True)
            shutil.move(staging, keep)
            print(f'  Staging: {keep}')
            return
    finally:
        shutil.rmtree(staging, ignore_errors=True)


if __name__ == '__main__':
    main()
