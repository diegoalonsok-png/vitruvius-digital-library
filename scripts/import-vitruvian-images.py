#!/usr/bin/env python3
"""Download source-attributed historical proportion illustrations into GitHub Pages.
Only approved Wikimedia Commons files. A failed transfer is not silently replaced."""
from pathlib import Path
from urllib.request import Request, urlopen
import time
files = {
    "images/hombre-vitruvio/taccola-vitruvian-man.jpg": "https://commons.wikimedia.org/wiki/Special:FilePath/Taccola_Vitruvian_man.jpg",
    "images/hombre-vitruvio/francesco-di-giorgio-saluzziano-148-3r.jpg": "https://commons.wikimedia.org/wiki/Special:FilePath/Figura_umana_sovrapposta_alla_pianta_di_una_cittadella.jpg",
    "images/hombre-vitruvio/duerer-proportions-1528.jpg": "https://commons.wikimedia.org/wiki/Special:FilePath/Albrecht_d%C3%BCrer%2C_quattro_libri_sulle_proporzioni_umane%2C_norimberga_1528.JPG",
}
for name, url in files.items():
    dest=Path(name)
    if dest.exists() and dest.stat().st_size>1500:
        print("Already present:", name)
        continue
    dest.parent.mkdir(parents=True,exist_ok=True)
    last=None
    for attempt in range(3):
        try:
            req=Request(url,headers={"User-Agent":"VitruviusDigitalLibrary-ScholarlyArchive/1.0 (source attribution in metadata)","Accept":"image/*"})
            with urlopen(req,timeout=40) as response:
                data=response.read(12_000_000)
                kind=response.headers.get("Content-Type","")
            if len(data)<1500 or not ("image/" in kind or data[:3]==b"\xff\xd8"):
                raise ValueError("Unexpected or empty image file: "+kind)
            dest.write_bytes(data)
            print("Downloaded",name,len(data))
            break
        except Exception as e:
            last=e
            time.sleep(2)
    else:
        raise SystemExit("FAIL "+name+": "+str(last))
