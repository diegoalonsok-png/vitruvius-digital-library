#!/usr/bin/env python3
"""Archive licensed Capitoline bust photo for the Onomasticon.
Work: Marble herm traditionally called Pythagoras, Musei Capitolini inv. MC0594.
Photo: Cmick25, 2025, CC BY-SA 4.0, Wikimedia Commons.
"""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import quote
import time
path=Path("images/personajes/pythagoras-musei-capitolini-mc0594.jpg")
name="Bust of Pythagoras at the Capitoline Museum.jpg"
source="https://commons.wikimedia.org/wiki/Special:FilePath/"+quote(name)+"?width=960"
path.parent.mkdir(parents=True,exist_ok=True)
if path.exists() and path.stat().st_size>30000:
 print("Already archived",path)
 raise SystemExit(0)
last=None
for attempt in range(4):
 try:
  request=Request(source,headers={"User-Agent":"VitruviusDigitalLibrary/1.0 (academic archival attribution; GitHub diegoalonsok-png/vitruvius-digital-library)","Accept":"image/jpeg"})
  with urlopen(request,timeout=50) as response: data=response.read(5000000)
  if not data.startswith(bytes([0xff,0xd8,0xff])) or len(data)<30000:raise ValueError("Not a valid historical JPEG facsimile")
  path.write_bytes(data)
  print("Saved",path,len(data))
  break
 except Exception as exc:
  last=exc;time.sleep(attempt+2)
else:
 raise RuntimeError("Image download failed: "+str(last))
