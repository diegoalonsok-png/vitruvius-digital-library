/* Philological utilities, source-limited; no inferred manuscript variants. */
export const EDITIONS=Object.freeze({
 "recensio-es":{version:"V514",lang:"es",doi:"10.5281/zenodo.23884757"},
 "recensio-fr":{version:"V554",lang:"fr",doi:"10.5281/zenodo.23885110"},
 "theory-en":{version:"V297",lang:"en",doi:"10.5281/zenodo.23885404"}
});
export function canonicalLocus(value){
 const roman={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};
 let t=String(value||"").trim().replace(/^Vitr(?:uvius)?\.?[,\s]*(?:De\s+arch\.?\s*)?/i,"");
 t=t.replace(/^([IVX]+)(?=\.)/i,(_,n)=>String(roman[n.toUpperCase()]||n));
 return /^([1-9]|10)\.(?:(?:praef)\.)?\d+(?:\.\d+)?$/i.test(t)?t.toLowerCase():null;
}
export function localURN(edition,locus){
 if(!EDITIONS[edition])return null;
 const l=canonicalLocus(locus);if(!l)return null;
 // Namespace VDL is LOCAL, not a claim of CTS registry registration.
 return "urn:cts:latinLit:phi1056.phi001.vdl-"+EDITIONS[edition].version.toLowerCase()+":"+l;
}
export function permanentLocusUrl(locus,edition){
 const l=canonicalLocus(locus);if(!l||!EDITIONS[edition])return null;
 return "https://vitruvius-digital-library.org/lector-bilingue.html?edition="+encodeURIComponent(edition)+"&locus="+encodeURIComponent(l);
}
export function normalized(text){return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
export function findLiteral(text,term){
 const src=String(text||""),q=normalized(term.trim());if(!q)return -1;
 return normalized(src).indexOf(q);
}
export function searchAttested(passages,query,{kind="literal",limit=200}={}){
 const tokens=normalized(query).split(/[^a-z0-9α-ω]+/).filter(Boolean);
 const out=[];if(!tokens.length)return out;
 for(const record of passages){
  const text=[record.latin,record.translation].filter(Boolean).join("\n");
  const norm=normalized(text);
  const hit=kind==="all-words"?tokens.every(t=>norm.includes(t)):norm.includes(normalized(query));
  if(hit){const pos=norm.indexOf(tokens[0]);out.push({locus:record.locus,edition:record.edition,text:text.slice(Math.max(0,pos-110),Math.min(text.length,pos+380))});if(out.length>=limit)break}
 }
 return out;
}
export function bibliographicCitation(edition,metadata,locus){
 if(!EDITIONS[edition]||!metadata)return null;const loc=canonicalLocus(locus);
 return (metadata.bibliographic_author||"Kurilo, Diego")+". "+metadata.bibliographic_title+". "+metadata.edition_statement+". "+metadata.publication_place+": "+metadata.publisher+", "+metadata.year+(loc?". Vitr. "+loc:"")+". https://doi.org/"+metadata.doi+".";
}
export function bibtex(edition,metadata){
 if(!EDITIONS[edition]||!metadata)return "";
 const key="Kurilo"+metadata.year+EDITIONS[edition].version;
 const esc=s=>String(s||"").replace(/[{}]/g,"");
 return "@book{"+key+",\n  author = {"+esc(metadata.bibliographic_author||"Kurilo, Diego")+"},\n  title = {"+esc(metadata.bibliographic_title)+"},\n  publisher = {"+esc(metadata.publisher)+"},\n  address = {"+esc(metadata.publication_place)+"},\n  year = {"+esc(metadata.year)+"},\n  doi = {"+esc(metadata.doi)+"},\n  isbn = {"+esc(metadata.isbn)+"}\n}\n";
}
export function ris(edition,metadata){
 if(!EDITIONS[edition]||!metadata)return "";
 return ["TY  - BOOK","AU  - "+(metadata.bibliographic_author||"Kurilo, Diego"),"TI  - "+metadata.bibliographic_title,"PY  - "+metadata.year,"PB  - "+metadata.publisher,"CY  - "+metadata.publication_place,"DO  - "+metadata.doi,"SN  - "+metadata.isbn,"UR  - https://doi.org/"+metadata.doi,"ER  - "].join("\n")+"\n";
}
