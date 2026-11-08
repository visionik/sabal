#!/usr/bin/env python3
"""Turn Codex's full-size pictures into the files SABAL ships.

usage: uv run --with pillow tools/ng/process.py <game> <raw-dir>

Rooms are cropped to 2:1 around the middle and shrunk to 1024x512; items are
cropped to what's visible and shrunk to fit 512x512. Both are saved as 8-bit
palette PNGs (items keep their transparency) in ng/<game>/. A picture whose
corners aren't transparent is reported, since an item must have an alpha
background.
"""
import os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ROOM = (1024, 512)
ITEM = 512

def main():
    game, raw = sys.argv[1], os.path.join(sys.argv[2], sys.argv[1])
    out = os.path.join(ROOT, 'ng', game)
    os.makedirs(out, exist_ok=True)
    for name in sorted(os.listdir(raw)):
        if not name.endswith('.png'): continue
        src = os.path.join(raw, name)
        dst = os.path.join(out, name)
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src): continue
        im = Image.open(src)
        if name.startswith('room-'):
            im = im.convert('RGB')
            w, h = im.size
            if w / h > 2: cw, ch = h * 2, h
            else: cw, ch = w, w // 2
            left, top = (w - cw) // 2, (h - ch) // 2
            im = im.crop((left, top, left + cw, top + ch)).resize(ROOM, Image.LANCZOS)
            im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(dst, optimize=True)
        else:
            im = im.convert('RGBA')
            a = im.getchannel('A')
            corners = [a.getpixel(p) for p in ((0, 0), (im.width - 1, 0), (0, im.height - 1), (im.width - 1, im.height - 1))]
            if min(corners) > 16 or a.getextrema()[0] > 16:
                print(f'NOT TRANSPARENT: {name}')
                continue
            im.putalpha(a.point(lambda v: 255 if v >= 240 else v))  # mostly-opaque is opaque
            box = a.point(lambda v: 255 if v > 24 else 0).getbbox()
            im = im.crop(box)
            im.thumbnail((ITEM, ITEM), Image.LANCZOS)
            im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(dst, optimize=True)
        print(f'{name} -> {os.path.getsize(dst) // 1024} KB')

if __name__ == '__main__':
    main()
