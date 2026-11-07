#!/usr/bin/env python3
"""Mirror public-domain Perrault page images from documented e-rara indices.

Each image is an independently addressable, optimized WebP; no OCR or
invented printed folio numbers. Re-running skips existing pages.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import pathlib
import time
import urllib.request
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCES = {"1673": "data/perrault-iiif-pages.json"}
USER_AGENT = "VitruviusDigitalLibrary/1.0 (public-domain scholarly facsimile mirror)"
Image.MAX_IMAGE_PIXELS = 100_000_000
MAX_TOTAL_BYTES = 25 * 1024 * 1024  # Hard limit: 25 MiB for the entire local Perrault cache
MAX_PAGE_BYTES = 150 * 1024  # Reject unusually large individual pages



def download(url: str, attempts: int = 3) -> bytes:
    last = None
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"}
            )
            with urllib.request.urlopen(request, timeout=35) as response:
                kind = response.headers.get("Content-Type", "")
                if "image/" not in kind:
                    raise ValueError(f"Unexpected content-type {kind} from {url}")
                raw = response.read(24_000_001)
                if len(raw) > 24_000_000:
                    raise ValueError("Source exceeds 24 MB safety limit")
                return raw
        except Exception as exc:
            last = exc
            time.sleep(min(2 ** attempt, 5))
    raise RuntimeError(str(last))


def convert(raw: bytes, output: pathlib.Path, max_width: int, quality: int) -> int:
    with Image.open(io.BytesIO(raw)) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        if image.width > max_width:
            new_height = round(image.height * max_width / image.width)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
        output.parent.mkdir(parents=True, exist_ok=True)
        temp = output.with_suffix(".tmp")
        image.save(temp, format="WEBP", quality=quality, method=5)
        size = temp.stat().st_size
        if size > MAX_PAGE_BYTES:
            temp.unlink(missing_ok=True)
            raise ValueError(f"Optimized image is {size:,} bytes, exceeds {MAX_PAGE_BYTES:,} page limit")
        os.replace(temp, output)
        return size


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", choices=["1673"], default="1673")
    parser.add_argument("--batch", type=int, default=12,
                        help="Maximum new pages per edition per run")
    parser.add_argument("--width", type=int, default=1000)
    parser.add_argument("--quality", type=int, default=58)
    args = parser.parse_args()
    if not (1 <= args.batch <= 370 and 500 <= args.width <= 2500
            and 45 <= args.quality <= 95):
        parser.error("Batch, width or quality outside expected range")
    total_downloaded = 0
    total_errors = 0
    for year in [args.year]:
        source = json.loads((ROOT / SOURCES[year]).read_text(encoding="utf-8"))
        pages = source["pages"]
        dest = ROOT / "images" / "perrault" / year
        count = 0
        total_size = sum(p.stat().st_size for p in dest.glob("page-*.webp")) if dest.exists() else 0
        for pos, page in enumerate(pages, 1):
            path = dest / f"page-{pos:04d}.webp"
            if path.exists() and path.stat().st_size > 2000:
                continue
            if count >= args.batch or total_size >= MAX_TOTAL_BYTES:
                print(f"STOP {year}: batch or 25 MiB storage cap reached", flush=True)
                break
            image_id = str(page["id"])
            if not image_id.isdigit():
                raise ValueError(f"Invalid institutional image ID at {year}/{pos}")
            urls = [
                f"https://www.e-rara.ch/i3f/v20/{image_id}/full/{args.width},/0/default.jpg",
                page["fallback"],
            ]
            try:
                last_error = None
                for url in urls:
                    try:
                        new_size = convert(download(url), path, args.width, args.quality)
                        if total_size + new_size > MAX_TOTAL_BYTES:
                            path.unlink(missing_ok=True)
                            print(f"STOP {year}: next image exceeds 25 MiB storage cap", flush=True)
                            count = args.batch
                            break
                        total_size += new_size
                        break
                    except (OSError, ValueError, RuntimeError, UnidentifiedImageError) as exc:
                        last_error = exc
                else:
                    raise RuntimeError(str(last_error))
                if not path.exists():
                    break
                count += 1
                total_downloaded += 1
                print(f"OK {year} digital image {pos}/{len(pages)} -> {path.relative_to(ROOT)}", flush=True)
            except Exception as exc:
                total_errors += 1
                print(f"ERROR {year} digital image {pos}: {exc}", flush=True)
        available = [
            i for i in range(1, len(pages) + 1)
            if (dest / f"page-{i:04d}.webp").exists()
        ]
        catalog = {
            "year": year,
            "source": source["source"],
            "image_count": len(pages),
            "available": available,
            "path_pattern": f"images/perrault/{year}/page-%04d.webp",
            "description": "Digitized images, not verified printed folio numbering.",
            "attribution": source.get("institution", "e-rara / ETH-Bibliothek Zürich"),
        }
        index_path = ROOT / "data" / f"perrault-local-{year}.json"
        index_path.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"{year}: {len(available)}/{len(pages)} mirrored; {count} new; {total_size / 1024 / 1024:.2f} MiB / 25 MiB maximum", flush=True)
    if total_errors and total_downloaded == 0:
        raise SystemExit("No image could be downloaded; see institutional access errors.")


if __name__ == "__main__":
    main()
