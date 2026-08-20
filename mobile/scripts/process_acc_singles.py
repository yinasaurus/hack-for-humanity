"""Knock white background from individually generated accessory PNGs."""
from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "assets", "accessories")
ASSETS = r"C:\Users\USER\.cursor\projects\c-Users-USER-Documents-side-proj-hack-for-humanity\assets"

SOURCES = {
    "bow": "acc_bow.png",
    "flower": "acc_flower.png",
    "beanie": "acc_beanie.png",
    "crown_soft": "acc_crown.png",
    "glasses": "acc_glasses.png",
    "scarf": "acc_scarf.png",
    "star": "acc_star.png",
    "heart": "acc_heart.png",
}


def knock_white(img: Image.Image, hard: int = 245, soft: int = 220) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            m = min(r, g, b)
            if m >= hard:
                px[x, y] = (r, g, b, 0)
            elif m >= soft:
                fade = int(255 * (hard - m) / max(1, hard - soft))
                px[x, y] = (r, g, b, fade)
    return img


def tight_square(img: Image.Image, size: int = 512) -> Image.Image:
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        pad = 12
        img = img.crop(
            (
                max(0, bbox[0] - pad),
                max(0, bbox[1] - pad),
                min(img.width, bbox[2] + pad),
                min(img.height, bbox[3] + pad),
            )
        )
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for name, file in SOURCES.items():
        path = os.path.join(ASSETS, file)
        if not os.path.exists(path):
            print("missing", path)
            continue
        out = tight_square(knock_white(Image.open(path)))
        dest = os.path.join(OUT, f"{name}.png")
        out.save(dest, optimize=True)
        print("saved", dest, out.size)


if __name__ == "__main__":
    main()
