// Whitespace and line-end hyphens in a PDF are layout, not editorial variants.
// This is an exact anchor lookup, never a fuzzy match or a page interpolation.
export const pdfReferenceAnchor=text=>String(text??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ſ/g,'s').replace(/v/g,'u').replace(/j/g,'i').replace(/[^\p{L}]/gu,'').slice(0,160);
export function resolvedPDFPage(passage,field,supplement){
 const declared=passage?.pdf_pages?.[field];
 if(Number.isInteger(declared)&&declared>0)return declared;
 const found=supplement?.[field];
 return found?.anchor?.length>=80&&found.anchor===pdfReferenceAnchor(passage?.[field])&&Number.isInteger(found.page)&&found.page>0?found.page:null;
}
