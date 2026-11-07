"""Outline the owner's approved logo; no fonts, generated substitutes or raster UI sheets.

Input: ОХУЕННЫЙ ЛОГОТИП!.png from the preserved 04.11.2026 references.
Only original geometric contours are exported. Presentation glow is omitted.
Requires Pillow; development tool only, never included in the client runtime.
"""
import hashlib
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
image = Image.open(source).convert("RGB")


def simplify(points, epsilon=0.85):
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = points[a]
        bx, by = points[b]
        length = math.hypot(bx - ax, by - ay)
        distances = [
            abs((by-ay)*x-(bx-ax)*y+bx*ay-by*ax)/length
            if length else math.hypot(x-ax, y-ay)
            for x, y in points[a+1:b]
        ]
        if distances and max(distances) > epsilon:
            k = a + 1 + distances.index(max(distances))
            keep.add(k)
            stack.extend([(a, k), (k, b)])
    return [points[k] for k in sorted(keep)]


def trace(box, predicate):
    crop = image.crop(box)
    mask = {(x, y) for y in range(crop.height) for x in range(crop.width)
            if predicate(*crop.getpixel((x, y)))}
    left, top = min(x for x, y in mask), min(y for x, y in mask)
    right, bottom = max(x for x, y in mask)+1, max(y for x, y in mask)+1
    edges = {}
    def add(a, b):
        edges.setdefault(a, []).append(b)
    for x, y in mask:
        if (x, y-1) not in mask: add((x, y), (x+1, y))
        if (x+1, y) not in mask: add((x+1, y), (x+1, y+1))
        if (x, y+1) not in mask: add((x+1, y+1), (x, y+1))
        if (x-1, y) not in mask: add((x, y+1), (x, y))
    polygons = []
    while edges:
        start = next(iter(edges))
        p, point = [start], start
        while True:
            options = edges.get(point)
            if not options: break
            nxt = options.pop()
            if not options: del edges[point]
            p.append(nxt)
            point = nxt
            if point == start: break
        area = sum(p[i][0]*p[i+1][1]-p[i+1][0]*p[i][1] for i in range(len(p)-1))/2
        if abs(area) > 15:
            polygons.append((simplify(p), area))
    polygons.sort(key=lambda p: -abs(p[1]))
    outlines = [[(x-left, y-top) for x, y in p] for p, area in polygons]
    path = " ".join("M"+" L".join(f"{x},{y}" for x, y in p)+" Z" for p in outlines)
    return {"viewBox": f"0 0 {right-left} {bottom-top}", "path": path}, outlines


fish, fish_polys = trace((650, 30, 1500, 310), lambda r, g, b: g > 210 and r > 140 and b < 125)
word, word_polys = trace((300, 310, 1750, 450), lambda r, g, b: min(r, g, b) > 185)
out = root / "public/brand"
out.mkdir(parents=True, exist_ok=True)

def svg(master, color="currentColor"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{master["viewBox"]}" fill="{color}" fill-rule="evenodd"><path d="{master["path"]}"/></svg>\n'

(out/"fish.svg").write_text(svg(fish))
(out/"wordmark.svg").write_text(svg(word))
for name, subtitle in [("zapruda-community", "COMMUNITY"), ("zapruda-spot", "SPOT")]:
    # The name is always an outline. Small descriptor uses a safe system font.
    content = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" role="img" aria-label="ZAPRUDA {subtitle}"><g fill="#D7FF35" fill-rule="evenodd" transform="translate(180 10) scale({240/int(fish["viewBox"].split()[2]):.6f})"><path d="{fish["path"]}"/></g><g fill="#F2F2F2" fill-rule="evenodd" transform="translate(30 115) scale({540/int(word["viewBox"].split()[2]):.6f})"><path d="{word["path"]}"/></g><text x="300" y="210" text-anchor="middle" fill="#D7FF35" font-family="Arial,sans-serif" font-size="19" font-style="italic" letter-spacing="9">{subtitle}</text></svg>\n'
    (out/(name+".svg")).write_text(content)

icon = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0B0D0E"/><g fill="#D7FF35" fill-rule="evenodd" transform="translate(66 138) scale({380/int(fish["viewBox"].split()[2]):.6f})"><path d="{fish["path"]}"/></g><g fill="#F2F2F2" fill-rule="evenodd" transform="translate(54 306) scale({404/int(word["viewBox"].split()[2]):.6f})"><path d="{word["path"]}"/></g></svg>\n'
(out/"app-icon.svg").write_text(icon)
canvas = Image.new("RGB", (1024, 1024), "#0B0D0E")
for master, polygons, width, origin, color in [(fish, fish_polys, 760, (132,276), "#D7FF35"), (word, word_polys, 808, (108,612), "#F2F2F2")]:
    scale = width/int(master["viewBox"].split()[2])
    layer = Image.new("1", canvas.size)
    draw = ImageDraw.Draw(layer)
    # Largest contours first; each interior contour toggles the even-odd fill.
    import PIL.ImageChops
    for polygon in polygons:
        part = Image.new("1", canvas.size)
        ImageDraw.Draw(part).polygon([(round(origin[0]+x*scale),round(origin[1]+y*scale)) for x,y in polygon],fill=1)
        layer = PIL.ImageChops.logical_xor(layer, part)
    canvas.paste(color, (0,0), layer)
for size in [32, 64, 180, 192, 512]:
    canvas.resize((size,size), Image.Resampling.LANCZOS).save(out/f"icon-{size}.png")
asset = root/"src/lib/brand-masters.json"
asset.write_text(json.dumps({"fish":fish,"wordmark":word}, ensure_ascii=False, indent=2)+"\n")
(out/"provenance.json").write_text(json.dumps({
    "source":source.name,"sourceSha256":hashlib.sha256(source.read_bytes()).hexdigest(),
    "approved":"2026-11-04","implementation":"2026-11-05",
    "method":"Owner-reference pixel contour to SVG outlines; no external font for ZAPRUDA; presentation glow omitted.",
    "referenceArchiveSha256":"153e4b2ff82d0cb33b0cdfdad571c22df625a50305927e7c849964b7082cd729",
},ensure_ascii=False,indent=2)+"\n")
print(json.dumps({"fishViewBox":fish["viewBox"],"wordmarkViewBox":word["viewBox"],"assets":len(list(out.iterdir()))}))
