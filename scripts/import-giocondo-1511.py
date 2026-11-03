#!/usr/bin/env python3
"""Archive Fra Giocondo 1511 title page and start of book III from e-rara.
Sequence numbers are digital images, NOT alleged folio signatures.
Downloaded images are stored locally for GitHub Pages. On HTTP failure stop.
"""
from pathlib import Path
from urllib.request import Request, urlopen
import time
items={
  3:6105673,
  51:6105722,
  52:6105723,
  53:6105724,
  54:6105725,
  55:6105726,
  56:6105727,
}
for page, ident in items.items():
    name=Path("images/giocondo-1511")/f"{page:04}.jpg"
    if name.exists() and name.stat().st_size>8000: continue
    url=f"https://www.e-rara.ch/i3f/v20/{ident}/full/1400,/0/default.jpg"
    name.parent.mkdir(parents=True,exist_ok=True)
    error=None
    for attempt in range(3):
        try:
            req=Request(url,headers={"User-Agent":"Mozilla/5.0 scholarly illustration archiving","Accept":"image/jpeg"})
            with urlopen(req,timeout=35) as response:
                data=response.read(8_000_000)
                ct=response.headers.get("Content-Type","")
            if not data.startswith(b"\\xff\\xd8") or len(data)<8000: raise ValueError("Not a JPG: "+ct)
            name.write_bytes(data)
            print("Saved",name,len(data))
            break
        except Exception as e:
            error=e
            time.sleep(attempt+2)
    else:
        raise RuntimeError(f"Unable to archive {page}: {error}")
