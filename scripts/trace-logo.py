"""Trace logo PNG to SVG using potracer."""
from __future__ import annotations

from pathlib import Path

from PIL import Image
from potracer import Bitmap

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/brand/logo-trace-source.png"
OUTPUT = ROOT / "public/brand/logo-traced.svg"


def main() -> None:
    img = Image.open(SOURCE).convert("L")
    width, height = img.size
    pixels = img.load()

    bitmap = Bitmap(width, height, True)
    for y in range(height):
        for x in range(width):
            if pixels[x, y] < 128:
                bitmap.set(x, y, True)

    paths = bitmap.trace(
        turdsize=2,
        turnpolicy=4,
        alphamax=1.0,
        opticurve=True,
        opttolerance=0.2,
    )

    curves = "\n".join(curve.to_svg() for curve in paths)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {width} {height}" fill="#0064F5" role="img" aria-label="ReuniAI">\n'
        f"{curves}\n"
        f"</svg>"
    )
    OUTPUT.write_text(svg, encoding="utf-8")
    print(f"Traced {len(paths)} paths -> {OUTPUT}")


if __name__ == "__main__":
    main()
