"""Check that search character offsets correspond to real PDF word boxes."""
import importlib.util
import pathlib
import fitz

path=pathlib.Path(__file__).with_name("publish-rose-krohn-folios-r2.py")
spec=importlib.util.spec_from_file_location("importer",path)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
doc=fitz.open();page=doc.new_page(width=500,height=700)
page.insert_text((50,100),"Symmetria et decor. Firmitas utilitas venustas.")
data=module.page_ocr(page,1,"rose-1899")
assert data["edition"]=="rose-1899" and data["page"]==1
assert len(data["words"])==6
for word in data["words"]:
 assert data["text"][word["start"]:word["end"]]==word["text"]
 assert 0<=word["x"]<1 and 0<=word["y"]<1
 assert 0<word["w"]<=1-word["x"]+0.000002
 assert 0<word["h"]<=1-word["y"]+0.000002
assert module.latin_tokens("VITRVVII symmetriā") == ["uitruuii","symmetria"]
print("PASS: PDF word boxes, exact text offsets, normalized Latin and scan identity")
