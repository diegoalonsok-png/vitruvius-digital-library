/* VITRUVIA · comprensión de la consulta en la página de resultados.
   1. Corrige errores de tipeo: vuelve a buscar con la forma corregida y ofrece volver a la original.
   2. Responde preguntas con un dato verificable (p. ej., ganador de un torneo) citando Wikidata.
   3. Ficha de persona o grupo en la columna derecha: reseña, nacimiento, muerte, estilos o géneros,
      obras una debajo de la otra y enlaces para comprar libros o escuchar música.
   No se muestran retratos de personas reales. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const lang=()=>["en","fr"].includes(document.documentElement.lang)?document.documentElement.lang:"es";
const T=(es,en,fr)=>lang()==="en"?en:lang()==="fr"?fr:es;
const el=(t,c,v)=>{const x=document.createElement(t);if(c)x.className=c;if(v!=null)x.textContent=String(v);return x};
const a=(text,url)=>{const x=el("a",null,text);x.href=url;x.target="_blank";x.rel="noopener noreferrer";return x};
let serial=0,skipCorrectionFor="",originalBeforeCorrection="",current=null;
const MONTHS={es:["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],fr:["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"]};
function fmt(d){if(!d)return"";if(d.precision<11)return d.year.replace(/^-(\d+)/,"$1 a. C.");const [y,m,dd]=d.iso.replace(/^-/,"").split("-");return (+dd)+" "+MONTHS[lang()][+m-1]+" "+(d.iso.startsWith("-")?y+" a. C.":y)}
function css(){if($("vitruvia-entity-style"))return;const s=el("style");s.id="vitruvia-entity-style";s.textContent=`
.vu-banner{margin:0 0 14px;font:14px/1.5 Arial,Helvetica,sans-serif;color:inherit;opacity:.92}.vu-banner button{background:none;border:0;color:#8ab4f8;cursor:pointer;font:inherit;padding:0;text-decoration:underline}
.vu-answer{border:1px solid rgba(201,168,76,.55);border-radius:12px;padding:16px 18px;margin:0 0 18px;font:14px/1.5 Arial,Helvetica,sans-serif}
.vu-answer .k{font:600 11px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.7}.vu-answer .v{font:400 26px/1.25 Georgia,"Times New Roman",serif;margin:4px 0 6px}.vu-answer small{opacity:.75}
.vu-card{border:1px solid rgba(150,140,120,.45);border-radius:14px;padding:18px 18px 14px;margin:0 0 18px;font:14px/1.55 Arial,Helvetica,sans-serif}
.vu-card h2{font:400 30px/1.12 Georgia,"Times New Roman",serif;margin:0 0 4px}.vu-card .vu-desc{font-size:15px;opacity:.9;margin:0 0 10px}
.vu-card dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:10px 0}.vu-card dt{font-weight:700;opacity:.8}.vu-card dd{margin:0}
.vu-card h3{font:600 11px/1.4 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;margin:16px 0 8px;opacity:.75}
.vu-work{border-top:1px solid rgba(150,140,120,.3);padding:9px 0}.vu-work strong{display:block;font:400 17px/1.3 Georgia,serif}.vu-work p{margin:2px 0 4px;opacity:.85}
.vu-links{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:13px}.vu-links a{text-decoration:underline;text-underline-offset:3px}
.vu-src{font-size:11px;opacity:.65;margin-top:12px}.vu-year{opacity:.7;font:600 13px Arial,sans-serif}.vu-more{margin:8px 0;border:1px solid rgba(150,140,120,.6);background:transparent;color:inherit;border-radius:999px;padding:7px 14px;cursor:pointer}`;document.head.append(s)}
function ensureHosts(){
 css();const list=$("result-list");if(!list)return{};
 let top=$("vitruvia-understanding");if(!top){top=el("div");top.id="vitruvia-understanding";list.before(top)}
 return{top};
}
function shopLinks(kind,name){
 const q=encodeURIComponent(name);
 if(kind==="music")return[["Spotify","https://open.spotify.com/search/"+q],["Apple Music","https://music.apple.com/search?term="+q],["YouTube Music","https://music.youtube.com/search?q="+q],["Bandcamp","https://bandcamp.com/search?q="+q],["Discos y vinilos · Discogs","https://www.discogs.com/search/?q="+q+"&type=all"]];
 const books=[["Amazon","https://www.amazon.com/s?k="+q+"&i=stripbooks"],["Google Books","https://www.google.com/search?tbm=bks&q="+q],["Bookshop.org","https://bookshop.org/search?keywords="+q],["Casa del Libro","https://www.casadellibro.com/?q="+q],["IberLibro (usados)","https://www.iberlibro.com/servlet/SearchResults?kn="+q]];
 return books;
}
function classify(f){
 const occ=(f.occupations||[]).map(x=>x.label.toLowerCase()).join(" ")+" "+(f.description||"").toLowerCase();
 if(f.kind==="band"||/cantante|músic|music|compositor|composer|singer|rapper|banda|guitarr|pianist|cantautor/.test(occ))return"music";
 if(/arquitect|architect|urbanist|ingenier/.test(occ))return"architect";
 if(/escritor|poeta|novelist|writer|author|ensayist|filósof|philosoph|historiador|dramaturg/.test(occ))return"author";
 if(/director de cine|cineasta|realizador|film director|filmmaker|réalisat/.test(occ))return"film";
 if(/pintor|painter|escultor|sculptor|artist/.test(occ))return"artist";
 return"person";
}

function actions(w,artist){
 const q=encodeURIComponent((w.kind==="album"||w.kind==="song"||w.kind==="book"||w.kind==="film"?artist+" ":"")+w.label);
 const L=[];const add=(t,u)=>L.push([t,u]);
 if(w.kind==="album"){add("Spotify","https://open.spotify.com/search/"+q);add("Apple Music","https://music.apple.com/search?term="+q);add("YouTube Music","https://music.youtube.com/search?q="+q);add(T("CD y vinilo · Discogs","CD & vinyl · Discogs","CD et vinyle · Discogs"),"https://www.discogs.com/search/?q="+q+"&type=release")}
 else if(w.kind==="song"){add("Spotify","https://open.spotify.com/search/"+q);add("YouTube","https://www.youtube.com/results?search_query="+q)}
 else if(w.kind==="book"){add("Amazon","https://www.amazon.com/s?k="+q+"&i=stripbooks");add("Casa del Libro","https://www.casadellibro.com/?q="+q);add("Google Books","https://www.google.com/search?tbm=bks&q="+q);
  if(+w.year&&+w.year<1930){add(T("Descarga libre · Internet Archive","Free download · Internet Archive","Téléchargement libre · Internet Archive"),"https://archive.org/search?query="+q+"&and[]=mediatype%3A%22texts%22");add("Project Gutenberg","https://www.gutenberg.org/ebooks/search/?query="+q)}}
 else if(w.kind==="film"){add(T("Dónde verla · JustWatch","Where to watch · JustWatch","Où la voir · JustWatch"),"https://www.justwatch.com/es/buscar?q="+encodeURIComponent(w.label));add("Amazon","https://www.amazon.com/s?k="+q+"&i=movies-tv")}
 else if(w.kind==="painting"){add("Google Arts & Culture","https://artsandculture.google.com/search?q="+encodeURIComponent(w.label));add("Commons","https://commons.wikimedia.org/w/index.php?search="+encodeURIComponent(w.label))}
 else if(w.kind==="building"){if(w.lat!=null)add(T("Mapa","Map","Carte"),"https://www.openstreetmap.org/?mlat="+w.lat+"&mlon="+w.lon+"#map=16/"+w.lat+"/"+w.lon);add(T("Planos y fotos · Commons","Plans and photos · Commons","Plans et photos · Commons"),"https://commons.wikimedia.org/w/index.php?search="+encodeURIComponent(w.label))}
 else add(T("Buscar","Search","Rechercher"),"https://www.google.com/search?q="+q);
 return L;
}
const HEAD={album:["Discografía · álbumes por fecha","Discography · albums by date","Discographie · albums par date"],song:["Canciones por fecha","Songs by date","Chansons par date"],film:["Filmografía por fecha","Filmography by date","Filmographie par date"],book:["Libros y obras escritas por fecha","Books and writings by date","Livres et écrits par date"],painting:["Pinturas y obras por fecha","Paintings and works by date","Peintures et œuvres par date"],building:["Edificios y proyectos por fecha","Buildings and projects by date","Bâtiments et projets par date"],work:["Obras por fecha","Works by date","Œuvres par date"]};
async function renderWorks(box,f,kind){
 const all=await window.VitruviaUnderstand.works(f.qid,lang()).catch(()=>[]);
 box.replaceChildren();
 const prefer=kind==="music"?["album","song"]:kind==="architect"?["building","work"]:kind==="author"?["book","work"]:kind==="artist"?["painting","work"]:kind==="film"?["film"]:["album","film","book","painting","building","work"];
 let main=null;for(const k of prefer){const n=all.filter(w=>w.kind===k);if(n.length){main=k;break}}
 let list=main?all.filter(w=>w.kind===main):[];
 if(!list.length&&f.works?.length){list=f.works.map(w=>({label:w.label,description:w.description,kind:kind==="architect"?"building":kind==="music"?"album":kind==="author"?"book":"work",article:w.wiki?"https://"+lang()+".wikipedia.org/wiki/"+encodeURIComponent(w.wiki.replace(/ /g,"_")):""}));main=list[0].kind}
 if(!list.length){box.append(el("p","vu-src",T("Wikidata no registra obras atribuidas a esta persona.","Wikidata records no works attributed to this person.","Wikidata n’enregistre aucune œuvre attribuée.")));return}
 const h=HEAD[main]||HEAD.work;box.append(el("h3",null,T(...h)+" · "+list.length));
 const draw=n=>{box.querySelectorAll(".vu-work,.vu-more").forEach(x=>x.remove());
  for(const w of list.slice(0,n)){const item=el("div","vu-work");
   const title=el("strong");if(w.year)title.append(el("span","vu-year",w.year.replace(/^-(\d+)/,"$1 a. C.")+" · "));title.append(w.label);item.append(title);
   const meta=[w.description,w.collection].filter(Boolean).join(" · ");if(meta)item.append(el("p",null,meta));
   const ln=el("p","vu-links");if(w.article)ln.append(a(T("Reseña · Wikipedia ↗","Overview · Wikipedia ↗","Présentation · Wikipédia ↗"),w.article));
   for(const [t,u] of actions(w,f.label))ln.append(a(t+" ↗",u));item.append(ln);box.append(item)}
  if(list.length>n){const more=el("button","vu-more",T("Ver todas (","Show all (","Tout afficher (")+list.length+")");more.type="button";more.addEventListener("click",()=>draw(list.length));box.append(more)}};
 draw(12);
 const others=[...new Set(all.map(w=>w.kind))].filter(k=>k!==main&&k!=="song"&&HEAD[k]);
 if(others.length){const o=el("p","vu-src",T("También hay en Wikidata: ","Also in Wikidata: ","Aussi dans Wikidata : ")+others.map(k=>T(...HEAD[k]).split(" · ")[0].toLowerCase()+" ("+all.filter(w=>w.kind===k).length+")").join(", "));box.append(o)}
}
async function renderCard(r){
 const f=r.entity;if(!f||!["person","band"].includes(f.kind))return;
 const panel=$("vitruvia-context");if(!panel)return;
 const kind=classify(f);
 const card=el("section","vu-card");card.id="vitruvia-entity-card";card.setAttribute("aria-label",T("Ficha de ","Profile of ","Fiche de ")+f.label);
 card.append(el("h2",null,f.label));if(f.description)card.append(el("p","vu-desc",f.description));
 const dl=el("dl");const row=(k,v)=>{if(!v)return;dl.append(el("dt",null,k),el("dd",null,v))};
 if(f.kind==="person"){
  row(T("Nacimiento","Born","Naissance"),[fmt(f.birth),f.birthPlace?.label].filter(Boolean).join(", "));
  row(T("Muerte","Died","Décès"),[fmt(f.death),f.deathPlace?.label].filter(Boolean).join(", "));
 }else row(T("Formación","Formed","Formation"),fmt(f.founded));
 row(T("Ocupación","Occupation","Profession"),(f.occupations||[]).slice(0,4).map(x=>x.label).join(", "));
 row(T("Estilo o movimiento","Style or movement","Style ou mouvement"),(f.movements||[]).slice(0,4).map(x=>x.label).join(", "));
 row(T("Géneros","Genres","Genres"),(f.genres||[]).slice(0,5).map(x=>x.label).join(", "));
 if(f.members?.length)row(T("Integrantes","Members","Membres"),f.members.slice(0,6).map(x=>x.label).join(", "));
 card.append(dl);
 const sm=f.wiki?await window.VitruviaUnderstand.summary(f.wiki,f.wikiLang).catch(()=>null):null;
 if(sm?.extract){card.append(el("h3",null,T("Reseña","Overview","Présentation")));card.append(el("p",null,sm.extract.length>700?sm.extract.slice(0,700).replace(/\s\S*$/,"")+"…":sm.extract));
  const l=el("p","vu-links");l.append(a(T("Leer en Wikipedia ↗","Read on Wikipedia ↗","Lire sur Wikipédia ↗"),"https://"+f.wikiLang+".wikipedia.org/wiki/"+encodeURIComponent(f.wiki.replace(/ /g,"_"))));card.append(l)}
 // Obras en orden cronológico (Wikidata): álbumes, películas, libros, cuadros o edificios según la persona.
 const worksBox=el("div","vu-works");worksBox.append(el("p","vu-src",T("Buscando obras…","Looking for works…","Recherche des œuvres…")));card.append(worksBox);
 renderWorks(worksBox,f,kind);
 card.append(el("h3",null,kind==="music"?T("Escuchar y comprar música","Listen and buy music","Écouter et acheter"):T("Comprar libros","Buy books","Acheter des livres")));
 const shop=el("p","vu-links");for(const [t,u] of shopLinks(kind==="music"?"music":"books",f.label))shop.append(a(t+" ↗",u));card.append(shop);
 card.append(el("p","vu-src",T("Datos: Wikidata (","Data: Wikidata (","Données : Wikidata (")+f.qid+T(") y Wikipedia. Enlaces de compra: búsquedas en cada tienda, sin afiliación.",") and Wikipedia. Shop links are store searches, without affiliation.",") et Wikipédia. Liens d’achat : recherches dans chaque boutique, sans affiliation.")));
 current={qid:f.qid,card};place();
}
function place(){
 const panel=$("vitruvia-context");if(!panel||!current)return;
 if(!panel.contains(current.card)){panel.prepend(current.card)}panel.hidden=false;
}
async function onSearch(query){
 const me=++serial;current=null;$("vitruvia-entity-card")?.remove();const hosts=ensureHosts();if(hosts.top)hosts.top.replaceChildren();
 if(!window.VitruviaUnderstand||!query||query.length<2)return;
 if(/^(?:vitr|[ivx]+\.\d|\d+\.\d|f\.|fol)/i.test(query.trim()))return; // locus o folio: lo resuelve el índice propio
 const r=await Promise.race([window.VitruviaUnderstand.resolve(query,lang()),new Promise(res=>setTimeout(()=>res(null),6000))]).catch(()=>null);
 if(me!==serial||!r)return;
 const top=ensureHosts().top;
 // 1. Corrección automática de tipeo (una sola vez por consulta).
 if(r.corrected&&skipCorrectionFor!==query){
  skipCorrectionFor=r.corrected;originalBeforeCorrection=query;
  const input=$("query"),form=$("search-form");if(input&&form){input.value=r.question?query.replace(new RegExp(r.subject.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"),r.corrected):r.corrected;form.requestSubmit();return}
 }
 if(originalBeforeCorrection&&skipCorrectionFor&&query!==originalBeforeCorrection){
  const b=el("p","vu-banner");b.append(T("Se muestran resultados de «","Showing results for «","Résultats pour «")+query+"». ");
  const back=el("button",null,T("Buscar en cambio «","Search instead for «","Rechercher plutôt «")+originalBeforeCorrection+"»");back.type="button";
  const orig=originalBeforeCorrection;back.addEventListener("click",()=>{skipCorrectionFor=orig;originalBeforeCorrection="";$("query").value=orig;$("search-form").requestSubmit()});
  b.append(back);top.append(b);originalBeforeCorrection="";
 }
 // 2. Respuesta directa a la pregunta.
 if(r.answer){
  const box=el("section","vu-answer");box.setAttribute("aria-label",T("Respuesta","Answer","Réponse"));
  box.append(el("div","k",(r.entity?.label||r.subject)+" · "+r.answer.label));
  if(r.answer.values.length){box.append(el("div","v",r.answer.values.map(v=>v.label).join(", ")))}
  else box.append(el("p",null,T("Wikidata todavía no registra este dato para «","Wikidata does not yet record this fact for «","Wikidata n’enregistre pas encore cette donnée pour «")+(r.entity?.label||r.subject)+T("». Consulta el artículo enciclopédico y las noticias recientes.","». Check the encyclopedia article and recent news.","». Consultez l’article et l’actualité récente.")));
  const s=el("small");s.append(T("Fuente: ","Source: ","Source : "),a("Wikidata "+r.entity.qid,r.answer.source));
  if(r.entity?.wiki){s.append(" · ",a("Wikipedia","https://"+r.entity.wikiLang+".wikipedia.org/wiki/"+encodeURIComponent(r.entity.wiki.replace(/ /g,"_"))))}
  box.append(s);top.append(box);
 }
 // 3. Ficha de persona o grupo musical.
 await renderCard(r);
}
window.addEventListener("vitruvia:search",e=>onSearch(e.detail?.query||""));
window.addEventListener("vitruvia:results",()=>setTimeout(place,0));
window.addEventListener("vitruvia:clear",()=>{serial++;current=null;$("vitruvia-entity-card")?.remove();$("vitruvia-understanding")?.replaceChildren()});
document.addEventListener("DOMContentLoaded",()=>{const panel=$("vitruvia-context");if(panel)new MutationObserver(()=>{if(current&&!panel.contains(current.card))setTimeout(place,0)}).observe(panel,{childList:true})});
})();
