"""Crop reference animals + knock out white backgrounds for companion PNGs."""
from __future__ import annotations

import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "assets", "pets")
REF = r"C:\Users\USER\.cursor\projects\c-Users-USER-Documents-side-proj-hack-for-humanity\assets\c__Users_USER_AppData_Roaming_Cursor_User_workspaceStorage_8e0b02f053276f39eb5a4d95c6817c00_images_image-fd9cf466-ce89-4c72-a932-85864fb1376c.png"
EXTRA = {
    "chick": r"C:\Users\USER\.cursor\projects\c-Users-USER-Documents-side-proj-hack-for-humanity\assets\chick.png",
    "otter": r"C:\Users\USER\.cursor\projects\c-Users-USER-Documents-side-proj-hack-for-humanity\assets\otter.png",
    "bean": r"C:\Users\USER\.cursor\projects\c-Users-USER-Documents-side-proj-hack-for-humanity\assets\bean.png",
}

os.makedirs(OUT, exist_ok=True)


def knock_white(img: Image.Image, hard: int = 248, soft: int = 228) -> Image.Image:
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


def tight_square(img: Image.Image, size: int = 768) -> Image.Image:
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        pad = 16
        x0 = max(0, bbox[0] - pad)
        y0 = max(0, bbox[1] - pad)
        x1 = min(img.width, bbox[2] + pad)
        y1 = min(img.height, bbox[3] + pad)
        img = img.crop((x0, y0, x1, y1))
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def save(name: str, img: Image.Image) -> None:
    path = os.path.join(OUT, f"{name}.png")
    img.save(path, optimize=True)
    print("saved", path, img.size)


def main() -> None:
    im = Image.open(REF).convert("RGBA")
    boxes = {
        "pup": (10, 5, 350, 305),
        "kit": (330, 0, 690, 300),
        "panda": (670, 5, 1020, 305),
        "fox": (20, 280, 420, 555),
        "bun": (380, 275, 780, 555),
    }
    for name, box in boxes.items():
        crop = knock_white(im.crop(box))
        save(name, tight_square(crop))

    for name, path in EXTRA.items():
        extra = knock_white(Image.open(path).convert("RGBA"))
        save(name, tight_square(extra))


if __name__ == "__main__":
    main()
