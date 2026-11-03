#!/usr/bin/env python3
"""Archive the Met's CC0 1615 Scamozzi Vitruvian-man page in GitHub Pages.
Reference: The Metropolitan Museum of Art, 42.60.2(40), 2608x3775 px.
"""
from pathlib import Path
from urllib.request import Request,urlopen
import time
path=Path("images/hombre-vitruvio/scamozzi-1615-p40.jpg")
urls=[
 "https://collectionapi.metmuseum.org/api/collection/v1/iiif/700428/1517036/main-image",
 "https://commons.wikimedia.org/wiki/Special:FilePath/Diagrams_of_proportion_and_the_human_body_from_L%27Idea_della_Architettura_%28book_1%2C_part_1%2C_page_40%29_MET_DP109546.jpg?width=1400"
]
path.parent.mkdir(parents=True,exist_ok=True)
if path.exists() and path.stat().st_size>30000:raise SystemExit("Already archived")
errors=[]
for url in urls:
 for attempt in range(3):
  try:
   req=Request(url,headers={"User-Agent":"Mozilla/5.0 (Vitruvius Digital Library archival research)","Accept":"image/jpeg"})
   with urlopen(req,timeout=40) as r:body=r.read(7500000)
   if len(body)<30000 or body[:3]!=bytes([255,216,255]):raise ValueError("Response is not a valid JPEG")
   path.write_bytes(body)
   print("Archived",path,len(body));raise SystemExit(0)
  except Exception as e:errors.append(str(e));time.sleep(attempt+2)
raise SystemExit("Failed to archive Scamozzi plate: "+"; ".join(errors))
