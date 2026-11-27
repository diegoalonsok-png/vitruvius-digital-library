/* Independent academic admission policy. Institutional provenance is not proof of accuracy or peer review. */
window.VitruviaAcademicPolicy=(function policy(){
 const norm=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const host=s=>String(s||"").match(/^https:\/\/([a-z0-9.-]+)(?::443)?(?:[/?#]|$)/i)?.[1]?.toLowerCase()||"";
 const safe=s=>host(s)&&!/[\\\s\u0000-\u001f]/.test(s)?String(s):"";
 const publisher=s=>/\b(?:university press|presses universitaires|universitatsverlag|editorial universitaria|brill|de gruyter|brepols|peeters|routledge|springer|elsevier|wiley|academic press|society of biblical literature|classical press of wales)\b/.test(norm(s));
 const institution=s=>{const h=host(safe(s));return /(?:^|\.)(?:edu|ac\.uk|edu\.ar|edu\.au|ac\.fr)$/.test(h)||/(?:^|\.)(?:metmuseum\.org|britishmuseum\.org|louvre\.fr|bnf\.fr|loc\.gov|bl\.uk|getty\.edu|si\.edu|dai\.de|ifao\.egnet\.net|cambridge\.org|oup\.com|jstor\.org)$/.test(h)};
 const popular=s=>/\b(?:blog|youtube|facebook|instagram|tiktok|pinterest|reddit|fanfiction|travel guide|popular science|popular history|divulgacion|juvenile|self help|book review|correction|retraction)\b/.test(norm(s));
 const words=s=>norm(s).split(" ").filter(x=>x.length>2&&!["the","and","for","with","del","las","los","una","sobre","para","des","les","der","und"].includes(x));
 function related(title,aliases){const t=" "+norm(title)+" ";return aliases.some(a=>{const w=words(a);return w.length>0&&w.every(x=>t.includes(" "+x+" "))})}
 function reference(text,urls){return !popular(text)&&(publisher(text)||urls.some(institution))}
 function crossref(row,aliases){
  const title=row.title?.[0]||"",doi=String(row.DOI||"");
  if(!title||!/^10\.\d{4,9}\/\S+$/.test(doi)||popular(title)||!related(title,aliases))return null;
  if(!["journal-article","book-chapter","book","monograph"].includes(row.type))return null;
  const venue=row["container-title"]?.[0]||"";
  if(!publisher(row.publisher)&&!(row.type==="journal-article"&&venue&&row.ISSN?.length&&institution(row.URL)))return null;
  return {id:doi.toLowerCase(),title,link:safe("https://doi.org/"+doi),author:(row.author||[]).slice(0,5).map(a=>[a.given,a.family].filter(Boolean).join(" ")).join("; "),venue:venue||row.publisher||"",year:row.published?.["date-parts"]?.[0]?.[0],kind:"Registro bibliográfico; arbitraje no comprobado"};
 }
 function local(row){return !!(row&&!row.ocr&&row.ocrEvidence!=="unverified"&&row.locus&&row.sourcePath&&row.workId&&typeof row.link==="string"&&/^(?:\.\/)?(?:classics-text-reader|lector-bilingue|classics-work-record)\.html\?/.test(row.link))}
 return {norm,safe,publisher,institution,popular,related,reference,crossref,local};
})();
