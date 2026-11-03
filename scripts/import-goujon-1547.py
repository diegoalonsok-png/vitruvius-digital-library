#!/usr/bin/env python3
"""Import authenticated 1547 Jean Martin / Jean Goujon proportions woodcuts.
Source: Houghton Library, OLC.V834.Eh547, p. 28 and p. 28 verso.
Wikimedia Commons reproductions. No illustrations are synthesized.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote
import time
objects = {
 "images/hombre-vitruvio/goujon-martin-1547-p28.jpg": "Houghton OLC.V834.Eh547 - Architecture, 1547, p. 28.jpg",
 "images/hombre-vitruvio/goujon-martin-1547-p28v.jpg": "Houghton OLC.V834.Eh547 - Architecture, 1547, p. 28 verso.jpg",
}
for path,filename in objects.items():
 dest=Path(path)
 if dest.exists() and dest.stat().st_size>30000:
  print("Already archived",path);continue
 dest.parent.mkdir(parents=True,exist_ok=True)
 url="https://commons.wikimedia.org/wiki/Special:FilePath/"+quote(filename)+"?width=1400"
 error=None
 for attempt in range(4):
  try:
   with urlopen(Request(url,headers={"User-Agent":"VitruviusDigitalLibrary/1.0 (scholarly source attribution, github.com/diegoalonsok-png/vitruvius-digital-library)","Accept":"image/jpeg"}),timeout=40) as resp:
    content=resp.read(10000000)
   if len(content)<30000 or not content.startswith(b"\\xff\\xd8"):
    raise ValueError("Invalid or tiny JPEG payload")
   dest.write_bytes(content)
   print("Saved",path,len(content));break
  except Exception as ex:
   error=ex;time.sleep(3*(attempt+1))
 else:
  raise RuntimeError(f"{filename} could not be downloaded: {error}")
