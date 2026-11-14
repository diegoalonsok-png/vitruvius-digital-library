/* Book-level TEI P5 export: authorial structured sources only, no fabricated variants. */
const $=id=>document.getElementById(id);
const escapeXML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));
const editions={"recensio-es":{version:"V514",lang:"es"},"recensio-fr":{version:"V554",lang:"fr"},"theory-en":{version:"V297",lang:"en"}};
const roman=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const load=async p=>{const r=await fetch(p);if(!r.ok)throw Error("HTTP "+r.status+" · "+p);return r.json()};
function bookTEI(meta,structured,book){
 const target=structured.passages.filter(p=>Number(p.book)===Number(book));
 if(!target.length)throw Error("No hay loci en este libro de la edición");
 const identity=editions[structured.edition],x=escapeXML;
 const opening='<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:lang="la">\n'+
 '<teiHeader><fileDesc><titleStmt><title>'+x(meta.bibliographic_title)+'</title><author>Marcus Vitruvius Pollio</author><editor>'+x(meta.author)+'</editor><respStmt><resp>Edición, traducción y comentario</resp><name>'+x(meta.author)+'</name></respStmt></titleStmt>'+
 '<publicationStmt><publisher>'+x(meta.publisher)+'</publisher><pubPlace>'+x(meta.publication_place)+'</pubPlace><date when="'+x(meta.year)+'">'+x(meta.year)+'</date><idno type="DOI">'+x(meta.doi)+'</idno><idno type="ISBN">'+x(meta.isbn)+'</idno><idno type="edition">'+x(meta.version)+'</idno><availability><p>Consultar condiciones de reutilización del texto en la edición original y el repositorio.</p></availability></publicationStmt>'+
 '<sourceDesc><bibl><title>'+x(meta.bibliographic_title)+'</title><idno type="source-file">'+x(structured.source?.filename||"")+'</idno><idno type="source-sha256">'+x(structured.source?.sha256||"")+'</idno></bibl></sourceDesc></fileDesc>'+
 '<encodingDesc><projectDesc><p>Transcodificación documental automática de los pasajes estructurados de la edición. No representa una nueva collatio ni modifica las lecturas del autor.</p></projectDesc><editorialDecl><normalization><p>Se conserva la grafía de los campos fuente; solo se escapan caracteres reservados XML.</p></normalization></editorialDecl></encodingDesc></teiHeader>\n'+
 '<text><body><div type="book" n="'+book+'" xml:id="vdl-'+identity.version.toLowerCase()+'-liber-'+book+'"><head>Liber '+roman[book]+'</head>\n';
 let lines=[opening];
 for(const p of target){
  const loc=String(p.locus),id="vdl-"+identity.version.toLowerCase()+"-"+loc.replace(/[^a-z0-9]+/gi,"-");
  lines.push('<div type="section" n="'+x(loc)+'" xml:id="'+id+'">');
  lines.push('<ab type="text" xml:lang="la">'+x(p.latin||"")+'</ab>');
  if(p.translation)lines.push('<ab type="translation" xml:lang="'+identity.lang+'">'+x(p.translation)+'</ab>');
  lines.push('</div>\n');
 }
 lines.push('</div></body></text></TEI>\n');
 return lines.join("");
}
function fileDownload(text,name){const blob=new Blob([text],{type:"application/tei+xml;charset=utf-8"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$("tei-form").addEventListener("submit",async e=>{
 e.preventDefault();const button=$("tei-submit"),status=$("tei-status"),ed=$("tei-edition").value,book=Number($("tei-book").value);
 button.disabled=true;button.textContent="Preparando TEI…";status.textContent="Leyendo el corpus estructurado y sus metadatos…";
 try{
  const [cat,vol]=await Promise.all([load("data/catalog.json"),load("data/structured/"+ed+".json")]);
  const metadata=(cat.editions||[]).find(x=>x.id===ed);if(!metadata)throw Error("Edición no presente en catálogo");
  const xml=bookTEI(metadata,vol,book),name="vitruvius-"+ed+"-liber-"+book+".tei.xml";
  fileDownload(xml,name);status.textContent="Exportación TEI P5 generada: "+name+". Fuente: "+vol.source?.filename+".";
 }catch(error){status.textContent="No pudo generarse el TEI: "+error.message}
 finally{button.disabled=false;button.textContent="Descargar TEI XML"}
});
