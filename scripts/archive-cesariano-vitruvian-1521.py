#!/usr/bin/env python3
"""Archive authentic Cesariano 1521 Vitruvian proportion woodcut to GitHub Pages.
Library of Congress LCCN 2006681079; image cph.3c10321, fol. 50r.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from time import sleep
dest=Path("images/hombre-vitruvio/cesariano-1521-homo-ad-circulum-50r.jpg")
urls=[
 "https://cdn.loc.gov/service/pnp/cph/3c10000/3c10000/3c10300/3c10321v.jpg",
 "https://cdn.loc.gov/service/pnp/cph/3c10000/3c10000/3c10300/3c10321r.jpg"
]
dest.parent.mkdir(parents=True,exist_ok=True)
if dest.exists() and dest.stat().st_size>20000:
 print("Already archived",dest)
 raise SystemExit(0)
issues=[]
for url in urls:
 for attempt in range(3):
  try:
   req=Request(url,headers={"User-Agent":"VitruviusDigitalLibrary/1.0 (archival research)","Accept":"image/jpeg"})
   with urlopen(req,timeout=35) as res:
    data=res.read(12000000)
   if not data.startswith(bytes([255,216,255])) or len(data)<20000:
    raise ValueError("Missing/invalid source JPEG")
   dest.write_bytes(data)
   print("Archived",len(data),"bytes",dest)
   raise SystemExit(0)
  except Exception as e:
   issues.append(str(e));sleep(attempt+2)
raise SystemExit("No archival image could be downloaded: "+" | ".join(issues))
