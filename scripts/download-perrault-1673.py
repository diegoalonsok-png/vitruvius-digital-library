#!/usr/bin/env python3
"""Download only the verified 1673 e-rara IIIF image IDs and make compact WebP folios.
The 1684 edition is intentionally excluded. Original attribution stays in the site.
Run in GitHub Actions or locally with Pillow installed. Idempotent and resumable.
"""
import argparse
import io
import json
import time
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = "https://www.e-rara.ch/i3f/v20/16797458/manifest"
INDEX = ROOT / "data/perrault-iiif-pages.json"
OUT = ROOT / "images/perrault/1673"
MANIFEST = ROOT / "data/perrault-local-1673.json"

def fetch(url):
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "VitruviusDigitalLibrary/1.0 scholarly public-domain reproduction",
                "Accept": "image/jpeg,image/*"
            })
            with urllib.request.urlopen(req, timeout=35) as response:
                if not response.headers.get("Content-Type", "").startswith("image/"):
                    raise RuntimeError("Server returned non-image content")
                data = response.read(16_000_001)
                if len(data) > 16_000_000:
                    raise RuntimeError("Image exceeds 16 MB safety limit")
                return data
        except Exception as exc:
            last = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(str(last))

def image_webp(data, file, width, quality):
    with Image.open(io.BytesIO(data)) as original:
        original.load()
        im = ImageOps.exif_transpose(original).convert("RGB")
        if im.width > width:
            im.thumbnail((width, max(1, im.height)), Image.Resampling.LANCZOS)
        file.parent.mkdir(parents=True, exist_ok=True)
        temp = file.with_suffix(".webp.tmp")
        im.save(temp, format="WEBP", quality=quality, method=5)
        temp.replace(file)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--count", type=int, default=370)
    args = parser.parse_args()
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    pages = index["pages"]
    if index.get("source") != SOURCE or len(pages) != 370:
        raise RuntimeError("Unexpected Perrault source: refusing to mix editions")
    available = []
    failed = []
    for n in range(1, 371):
        if (OUT / f"page-{n:04d}.webp").is_file() and (OUT / f"thumb-{n:04d}.webp").is_file():
            available.append(n)
    stop = min(370, args.start + args.count - 1)
    for n in range(max(1, args.start), stop + 1):
        folio = OUT / f"page-{n:04d}.webp"
        thumb = OUT / f"thumb-{n:04d}.webp"
        if folio.is_file() and thumb.is_file():
            print(f"SKIP {n}/370: already present", flush=True)
            continue
        entry = pages[n-1]
        image_id = str(entry["id"])
        if not image_id.isdecimal():
            raise RuntimeError(f"Invalid IIIF image ID at {n}")
        # Request a readable, bounded source image, never an original multi-MB master.
        url = f"https://www.e-rara.ch/i3f/v20/{image_id}/full/1400,/0/default.jpg"
        try:
            data = fetch(url)
            image_webp(data, folio, 1400, 76)
            image_webp(data, thumb, 240, 62)
            available.append(n)
            print(f"OK {n}/370: {folio.stat().st_size} B, thumb {thumb.stat().st_size} B", flush=True)
            time.sleep(0.35)
        except Exception as exc:
            failed.append({"number": n, "image_id": image_id, "error": str(exc)})
            print(f"FAIL {n}: {exc}", flush=True)
    # Scan again because previous batches may already exist.
    available = [n for n in range(1,371)
        if (OUT / f"page-{n:04d}.webp").is_file()
        and (OUT / f"thumb-{n:04d}.webp").is_file()]
    MANIFEST.write_text(json.dumps({
        "year": "1673", "source": SOURCE, "image_count": 370,
        "format": "webp", "available": available, "failed_this_run": failed,
        "credit": "ETH-Bibliothek Zürich / e-rara; DOI 10.3931/e-rara-61952"
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"LOCAL FOLIOS: {len(available)}/370. New failures: {len(failed)}")
    if failed:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
