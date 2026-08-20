"""Crop accessory sheet into individual transparent PNGs."""
from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "assets", "accessories")
SHEET = r"C:\Users\USER\.cursor\projects\c-Users-USER-Documents-side-proj-hack-for-humanity\assets\accessories_sheet.png"

os.makedirs(OUT, exist_ok=True)


def knock_dark(img: Image.Image, hard: int = 28) -> Image.Image:
    """Remove near-black background."""
    img = img.convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if r <= hard and g <= hard and b <= hard:
                px[x, y] = (0, 0, 0, 0)
            elif r < 55 and g < 55 and b < 55:
                fade = int(255 * (max(r, g, b) - hard) / max(1, 55 - hard))
                px[x, y] = (r, g, b, max(0, min(255, fade)))
    return img


def tight_square(img: Image.Image, size: int = 512) -> Image.Image:
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        pad = 20
        x0, y0, x1, y1 = bbox
        img = img.crop(
            (
                max(0, x0 - pad),
                max(0, y0 - pad),
                min(img.width, x1 + pad),
                min(img.height, y1 + pad),
            )
        )
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    im = Image.open(SHEET).convert("RGBA")
    w, h = im.size
    print("sheet", w, h)
    # 2 rows x 4 cols approximate grid
    cols, rows = 4, 2
    cw, rh = w // cols, h // rows
    names = [
        "bow",
        "flower",
        "beanie",
        "crown_soft",
        "glasses",
        "scarf",
        "star",
        "heart",
    ]
    i = 0
    for row in range(rows):
        for col in range(cols):
            if i >= len(names):
                break
            box = (col * cw + 8, row * rh + 8, (col + 1) * cw - 8, (row + 1) * rh - 8)
            crop = knock_dark(im.crop(box))
            out = tight_square(crop)
            path = os.path.join(OUT, f"{names[i]}.png")
            out.save(path, optimize=True)
            print("saved", names[i], path)
            i += 1


if __name__ == "__main__":
    main()
