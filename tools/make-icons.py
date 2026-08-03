#!/usr/bin/env python3
"""Erzeugt die Tubeless-Icons (rotes abgerundetes Quadrat mit dunklem Balken).

Kein Pillow noetig — schreibt PNGs direkt mit zlib. 4x-Supersampling fuer
saubere Kanten.

    python3 tools/make-icons.py
"""
import os
import struct
import zlib

FG = (0xFF, 0x3B, 0x30)   # Rot
BAR = (0x0F, 0x0F, 0x0F)  # Fast-Schwarz
SS = 4                    # Supersampling-Faktor


def rounded_rect(x, y, w, h, radius):
    """True, wenn Punkt (x, y) im abgerundeten Rechteck liegt."""
    cx = min(max(x, radius), w - radius)
    cy = min(max(y, radius), h - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def render(size):
    n = size * SS
    radius = n * 0.22
    bar_x0, bar_x1 = n * 0.24, n * 0.76
    bar_y0, bar_y1 = n * 0.455, n * 0.545

    # Supersampled Maske: 0 = leer, 1 = rot, 2 = Balken
    hi = bytearray(n * n)
    for y in range(n):
        py = y + 0.5
        in_bar_y = bar_y0 <= py <= bar_y1
        row = y * n
        for x in range(n):
            px = x + 0.5
            if not rounded_rect(px, py, n, n, radius):
                continue
            hi[row + x] = 2 if (in_bar_y and bar_x0 <= px <= bar_x1) else 1

    # Herunterrechnen auf die Zielgroesse
    raw = bytearray()
    samples = SS * SS
    for y in range(size):
        raw.append(0)  # PNG-Filter: none
        for x in range(size):
            r = g = b = a = 0
            for sy in range(SS):
                base = (y * SS + sy) * n + x * SS
                for sx in range(SS):
                    v = hi[base + sx]
                    if v == 0:
                        continue
                    c = FG if v == 1 else BAR
                    r += c[0]
                    g += c[1]
                    b += c[2]
                    a += 255
            if a == 0:
                raw.extend((0, 0, 0, 0))
            else:
                covered = a // 255
                raw.extend((r // covered, g // covered, b // covered, a // samples))
    return bytes(raw)


def chunk(tag, data):
    return (
        struct.pack('>I', len(data))
        + tag
        + data
        + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path, size):
    header = struct.pack('>2I5B', size, size, 8, 6, 0, 0, 0)
    png = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', header)
        + chunk(b'IDAT', zlib.compress(render(size), 9))
        + chunk(b'IEND', b'')
    )
    with open(path, 'wb') as fh:
        fh.write(png)
    return len(png)


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
    os.makedirs(out, exist_ok=True)
    for size in (16, 32, 48, 128):
        path = os.path.join(out, f'icon{size}.png')
        print(f'{path} — {write_png(path, size)} Bytes')
