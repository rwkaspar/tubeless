#!/usr/bin/env python3
"""Baut alle Verteilpakete nach dist/, Versionsnummer im Dateinamen.

    python3 tools/build.py            # alles, was moeglich ist
    python3 tools/build.py --no-crx   # ohne .crx (z. B. in CI, wo der
                                      # Signaturschluessel fehlt)

Erzeugt:
    dist/tubeless-chrome-<version>.zip    Upload fuer den Chrome Web Store
                                          (der Store nimmt kein .crx an!)
    dist/tubeless-firefox-<version>.xpi   Upload fuer addons.mozilla.org
    dist/tubeless-<version>.crx           signiertes Archiv (nur lokal:
                                          braucht Chromium + den Schluessel
                                          unter ~/.config/tubeless/)

Aeltere Versionsstaende in dist/ werden ersetzt — die Historie liegt in Git.

Firefox-Manifest: browser_specific_settings mit fester Gecko-ID (Pflicht fuer
MV3 und storage.sync), strict_min_version 140 (:has() braucht 121, die
Datenerhebungs-Erklaerung data_collection_permissions braucht 140, die
Android-Variante 142); minimum_chrome_version faellt raus, das wuerde der
AMO-Linter als unbekannten Schluessel anmeckern.
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
PAYLOAD = ['manifest.json', '_locales', 'src', 'popup', 'icons',
           'README.md', 'LICENSE']

GECKO_ID = 'tubeless@neotactiq.ai'
MIN_FIREFOX = '140.0'
KEY = os.path.expanduser('~/.config/tubeless/tubeless.pem')
CHROMIUM = next((p for p in ('/snap/bin/chromium', '/usr/bin/chromium',
                             '/usr/bin/google-chrome') if os.path.exists(p)), None)


def chrome_manifest():
    with open(os.path.join(ROOT, 'manifest.json')) as fh:
        return json.load(fh)


def firefox_manifest():
    manifest = chrome_manifest()
    manifest.pop('minimum_chrome_version', None)
    manifest['browser_specific_settings'] = {
        'gecko': {
            'id': GECKO_ID,
            'strict_min_version': MIN_FIREFOX,
            # Tubeless erhebt nichts; der opt-in SponsorBlock-Abruf ueber-
            # traegt nur ein anonymes Hash-Praefix an einen Drittanbieter.
            'data_collection_permissions': {'required': ['none']},
        },
        # Android liest data_collection_permissions erst ab 142
        'gecko_android': {'strict_min_version': '142.0'},
    }
    return manifest


def write_package(target, manifest_override=None):
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
        for entry in PAYLOAD:
            path = os.path.join(ROOT, entry)
            if entry == 'manifest.json' and manifest_override is not None:
                z.writestr('manifest.json',
                           json.dumps(manifest_override, indent=2,
                                      ensure_ascii=False) + '\n')
            elif os.path.isdir(path):
                for base, _dirs, files in os.walk(path):
                    for name in sorted(files):
                        full = os.path.join(base, name)
                        z.write(full, os.path.relpath(full, ROOT))
            else:
                z.write(path, entry)
    return target


def build_crx(version):
    """Signiertes Archiv-Paket. Snap-Chromium kommt weder an ~/.config noch an
    /tmp heran, deshalb Staging und Schluesselkopie an einem Pfad, dessen
    erste Ebene unter $HOME kein Punkt-Verzeichnis ist."""
    if not os.path.exists(KEY):
        print(f'  crx uebersprungen: kein Schluessel unter {KEY}')
        return None
    if not CHROMIUM:
        print('  crx uebersprungen: kein Chromium gefunden')
        return None

    parent = os.path.dirname(ROOT)
    staging = os.path.join(parent, '.tubeless-build')
    key_copy = os.path.join(parent, '.tubeless-key.pem')
    try:
        shutil.rmtree(staging, ignore_errors=True)
        os.makedirs(staging)
        for entry in PAYLOAD:
            src = os.path.join(ROOT, entry)
            dst = os.path.join(staging, entry)
            (shutil.copytree if os.path.isdir(src) else shutil.copy2)(src, dst)
        shutil.copy2(KEY, key_copy)
        os.chmod(key_copy, 0o600)
        result = subprocess.run(
            [CHROMIUM, f'--pack-extension={staging}',
             f'--pack-extension-key={key_copy}'],
            capture_output=True, text=True, timeout=120)
        crx = staging + '.crx'
        if not os.path.exists(crx):
            print(f'  crx fehlgeschlagen: {result.stderr.strip()[:200]}')
            return None
        target = os.path.join(DIST, f'tubeless-{version}.crx')
        shutil.move(crx, target)
        return target
    finally:
        shutil.rmtree(staging, ignore_errors=True)
        for leftover in (key_copy, staging + '.crx'):
            if os.path.exists(leftover):
                os.remove(leftover)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-crx', action='store_true',
                        help='signiertes .crx nicht bauen (CI)')
    args = parser.parse_args()

    version = chrome_manifest()['version']
    os.makedirs(DIST, exist_ok=True)

    # Alte Staende ersetzen — auch die unversionierten Namen von frueher
    for pattern in ('tubeless-chrome-*.zip', 'tubeless-firefox-*.xpi',
                    'tubeless-*.crx', 'tubeless-chrome.zip',
                    'tubeless-firefox.xpi', 'tubeless.crx'):
        for stale in glob.glob(os.path.join(DIST, pattern)):
            os.remove(stale)

    built = [
        write_package(os.path.join(DIST, f'tubeless-chrome-{version}.zip')),
        write_package(os.path.join(DIST, f'tubeless-firefox-{version}.xpi'),
                      firefox_manifest()),
    ]
    if not args.no_crx:
        crx = build_crx(version)
        if crx:
            built.append(crx)

    print(f'Version {version}:')
    for path in built:
        print(f'  {os.path.relpath(path, ROOT)}'
              f'  ({os.path.getsize(path) // 1024} KB)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
