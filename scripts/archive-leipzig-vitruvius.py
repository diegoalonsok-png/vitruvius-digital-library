#!/usr/bin/env python3
"""Store the documented Leipzig imaginary Vitruvius etching on GitHub Pages."""
from pathlib import Path
from urllib.request import Request, urlopen
import time
dest=Path("images/retratos/marcus-vitruvius-roman-leipzig-55-45.jpg")
urls=[
 "https://commons.wikimedia.org/wiki/Special:FilePath/Marcus_Vitruvius_Roman._portrait.jpg",
 "https://upload.wikimedia.org/wikipedia/commons/6/6c/Marcus_Vitruvius_Roman._portrait.jpg"
]
dest.parent.mkdir(parents=True,exist_ok=True)
if dest.exists() and dest.stat().st_size>10000:
 print("Already archived:", dest)
 raise SystemExit(0)
errors=[]
for url in urls:
 for attempt in range(2):
  try:
   with urlopen(Request(url,headers={"User-Agent":"VitruviusDigitalLibrary/1.0 (archival attribution project; contact via GitHub project page)","Accept":"image/jpeg"}),timeout=40) as r:
    data=r.read(3000000)
   if not data.startswith(b"\\xff\\xd8") or len(data)<20000:
    raise ValueError("Invalid JPEG response")
   dest.write_bytes(data)
   print("Archived",dest,len(data))
   raise SystemExit(0)
  except Exception as e:
   errors.append(str(e));time.sleep(2)
raise SystemExit("Download failed: "+ "; ".join(errors))
