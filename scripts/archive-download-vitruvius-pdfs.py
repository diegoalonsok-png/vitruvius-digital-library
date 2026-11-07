#!/usr/bin/env python3
"""
Vitruvius Digital Library - Batch downloader
Diego Kurilo - e-rara + Gallica + HAB + BL IIIF

Uso: python download_vitruvius_pdfs.py
Requiere: pip install requests
"""
import requests, os, json
from pathlib import Path

OUT_DIR = Path("pdfs_historicos")
OUT_DIR.mkdir(exist_ok=True)

PDFS = {
    "Cesariano_1521_Como.pdf": "https://www.e-rara.ch/download/pdf/1810844.pdf",
    "Barbaro_1556_Venezia.pdf": "https://www.e-rara.ch/download/pdf/1993175.pdf",
    "Perrault_1673_Paris.pdf": "https://www.e-rara.ch/download/pdf/16934061.pdf",
    "Galiani_1758_Napoli.pdf": "https://www.e-rara.ch/download/pdf/14507727.pdf",
}

def download(url, dest):
    print(f"-> Bajando {dest.name} desde {url}")
    try:
        r = requests.get(url, stream=True, timeout=60, headers={"User-Agent":"VitruviusDigitalLibrary/1.0"})
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"   OK: {dest.stat().st_size/1_000_000:.1f} MB")
    except Exception as e:
        print(f"   ERROR {dest.name}: {e}")

for name, url in PDFS.items():
    download(url, OUT_DIR / name)

print("\n--- Codices IIIF ---")
print("Para H (Harley MS 2767) usar manifest:")
print("https://bl.digirati.io/iiif/ark:/81055/vdc_100056038850.0x000001")
print("Herramienta recomendada: https://github.com/IIIF/iiif-apis - iiif-download o Mirador export PDF")
print("\nPara Gudianus usar: https://diglib.hab.de/?db=mss&list=ms&id=69-gud-lat")
print("Para Oxford Auct F57: https://digital.bodleian.ox.ac.uk/objects/2b79c8ae-67d9-49a5-9a64-4f4973faf035/")

# Generar catalogo local
with open(OUT_DIR / "catalogo.json", "w", encoding="utf-8") as f:
    json.dump(list(PDFS.keys()), f, indent=2)

print("\nListo. Archivos en ./pdfs_historicos/")