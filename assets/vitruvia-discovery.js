/* Shared query intent and visual relevance. Entity identity comes from Wikidata;
 * a related context is never substituted for the object or person requested. */
(()=>{
 "use strict";
 const fold=value=>String(value||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const plain=value=>String(value||"").replace(/<[^>]*>/g," ").replace(/&(?:nbsp|amp|quot|lt|gt);/g," ").replace(/\s+/g," ").trim();
 const unique=values=>[...new Set(values.filter(Boolean))];
 const families=[
  {id:"coffee",aliases:["cafetera","cafeteras","coffee maker","coffee makers","coffeemaker","coffee machine","cafetiere"],
   topics:{es:["Historia del café","Café"],en:["History of coffee","Coffee preparation"],fr:["Histoire du café","Préparation du café"]}},
  {id:"cookware",aliases:["sarten","sartenes","frying pan","frying pans","skillet","poele"],
   topics:{es:["Historia de la gastronomía","Utensilio de cocina"],en:["Cookware and bakeware","Cooking"],fr:["Histoire de la cuisine","Ustensile de cuisine"]}}
 ];
 const objectWords=/\b(aparato|dispositivo|utensilio|herramienta|recipiente|maquina|electrodomestico|instrumento|appliance|device|utensil|tool|machine|cookware|appareil|ustensile|outil)\b/;
 const peopleWords=/\b(filosofo|filosofa|matematico|matematica|escritor|escritora|emperador|pintor|pintora|philosopher|mathematician|writer|emperor|painter|historian|politician|actor|actress|philosophe|ecrivain|empereur|peintre)\b/;
 function plan(query,identity={}){
  const subject=identity.canonical||query,terms=unique([fold(subject),fold(query),...(identity.aliases||[]).map(fold)]);
  const description=fold(identity.authorityDescription||identity.description);
  let family=families.find(f=>f.aliases.some(a=>terms.includes(a)));
  if(!family&&/\b(cafetera|coffee maker|coffeemaker|cafetiere)\b/.test(description))family=families[0];
  if(!family&&/\b(utensilio de cocina|cooking utensil|cookware|ustensile de cuisine)\b/.test(description))family=families[1];
  const person=identity.kind==="person"||identity.instanceOf?.includes("Q5")||(!identity.kind&&peopleWords.test(description));
  const kind=family?"object":person?"person":objectWords.test(description)?"object":"topic";
  const q=fold(query);
  const intent=/\b(pinturas|cuadros|paintings|artworks|tableaux)\b/.test(q)?"artworks":/\b(bustos|busts|esculturas|sculptures)\b/.test(q)?"sculptures":/\b(libros|books|manuscritos|manuscripts)\b/.test(q)?"books":"overview";
  const visualName=identity.commonsSearchName||identity.originalCanonical||subject;
  const aliases=unique([subject,visualName,...(identity.aliases||[])]);
  const queries=intent==="artworks"?[visualName+" painting",visualName+" artwork",query]:
   intent==="sculptures"?[visualName+" bust",visualName+" sculpture",query]:
   intent==="books"?[visualName+" book",visualName+" manuscript",query]:
   kind==="person"?[visualName+" bust",visualName+" portrait painting",visualName+" book manuscript",visualName,subject]:
   kind==="object"?[visualName,visualName+" museum historic",visualName+" history book",subject]:[visualName,subject,query];
  return {kind,intent,subject,aliases,queries:unique(queries).slice(0,5),family:family?.id||null,
   contextTitles:family?.topics||null,ancient:typeof identity.birthYear==="number"&&identity.birthYear<0};
 }
 const groups={
  sculpture:{es:"Bustos y esculturas",en:"Busts and sculptures",fr:"Bustes et sculptures"},
  portrait:{es:"Retratos, cuadros y grabados",en:"Portraits, paintings and engravings",fr:"Portraits, tableaux et gravures"},
  book:{es:"Libros, manuscritos y ediciones",en:"Books, manuscripts and editions",fr:"Livres, manuscrits et éditions"},
  object:{es:"El objeto y sus tipos",en:"The object and its types",fr:"L’objet et ses types"},
  historic:{es:"Ejemplares históricos y colecciones",en:"Historic examples and collections",fr:"Exemplaires historiques et collections"},
  technical:{es:"Funcionamiento, planos y diagramas",en:"Operation, plans and diagrams",fr:"Fonctionnement, plans et schémas"},
  artwork:{es:"Obras y representaciones artísticas",en:"Artworks and artistic representations",fr:"Œuvres et représentations artistiques"},
  context:{es:"Otras imágenes relacionadas",en:"Other related images",fr:"Autres images liées"}
 };
 const bust=/\b(bust|busts|busto|bustos|buste|bustes|sculpture|sculptures|scultura|escultura|esculturas|statue|statues|estatua|herm|herma|marble head|portrait head)\b/;
 const portrait=/\b(portrait|portraits|retrato|retratos|painting|paintings|pintura|pinturas|fresco|frescos|engraving|engravings|grabado|grabados|woodcut|lithograph|drawing|dibujo|photograph|photography|foto|photo|raffae?l+o?|sanzio)\b/;
 const book=/\b(book|books|libro|libros|manuscript|manuscripts|manuscrit|codex|codices|incunabul\w*|frontispiece|frontispicio|title page|treatise|scan|scanned|djvu|bibliotheca|de vita)\b/;
 const technical=/\b(theorem|teorema|diagram|diagrams|diagrama|triang\w*|geometry|geometria|geometric|formula|demonstration|patent|patente|schematic|section drawing)\b/;
 function imageGroup(page,topic){
  const info=page.imageinfo?.[0],meta=info?.extmetadata||{};
  const fileName=fold(page.title);
  const name=fold((page.title||"")+" "+(page.sourceCategory||""));
  const description=fold(plain(meta.ImageDescription?.value).slice(0,1800));
  // A collection label must not turn a coin or a print into a marble bust.
  if(topic.kind==="person"&&/\b(coin|coins|moneda|monedas|aureus|denarius|sestertius|medal|medaille|stamp|stamps)\b/.test(fileName))return "context";
  if(book.test(fileName))return "book";
  if(topic.kind==="person"&&/\b(engraving|engravings|grabado|grabados|woodcut|lithograph|etching|painting|paintings|drawing|dibujo|fresco|print|prints)\b/.test(fileName))return topic.intent==="artworks"?"artwork":"portrait";
  if(book.test(name))return "book";
  if(topic.kind==="person"){
   if(bust.test(name))return "sculpture";
   if(technical.test(name)||/\b(logo|map|mapa|stamp|coin|school|university|university building)\b/.test(name))return "context";
   if(portrait.test(name))return topic.intent==="artworks"?"artwork":"portrait";
   if(bust.test(description))return "sculpture";
   if(book.test(description))return "book";
   if(page.fromEntityImage||portrait.test(description))return "portrait";
   return "context";
  }
  if(technical.test(name))return "technical";
  if(topic.kind==="object"){
   if(/\b(antique|ancient|historic|historical|antiguo|antigua|antica|museum|museo|musee|archeolog\w*|roman|romano|vintage|century|siglo|b c|bce|a c)\b/.test(name+" "+description))return "historic";
   return "object";
  }
  if(portrait.test(name)||bust.test(name))return "artwork";
  return "context";
 }
 function imageRank(page,topic){
  const info=page.imageinfo?.[0],meta=info?.extmetadata||{};
  const name=fold(page.title),description=fold(plain(meta.ImageDescription?.value).slice(0,3500));
  let score=0,matched=false;
  for(const alias of topic.aliases){
   const term=fold(alias);if(term.length<3)continue;
   const inName=(" "+name+" ").includes(" "+term+" ");
   const inDescription=(" "+description+" ").includes(" "+term+" ");
   const words=term.split(" ").filter(w=>w.length>2&&!['the','and','del','los','las','of','de'].includes(w));
   const complete=words.length>1&&words.every(w=>(" "+name+" ").includes(" "+w+" "));
   if(inName||inDescription||complete){matched=true;score=Math.max(score,(inName?120:0)+(complete?70:0)+(inDescription?25:0))}
  }
  // Only entity images and subject-specific collections may bypass a title match.
  if(page.fromEntityImage){matched=true;score+=160}
  const institution=plain(meta.Institution?.value||meta.Credit?.value||"");
  if(/museum|museo|musee|british library|bibliotheque|metropolitan|hermitage|uffizi|louvre|capitolini/i.test(institution+" "+name))score+=25;
  if(/\b(surgical mask|face mask|mascarilla|meme|parody|parodia|souvenir)\b/.test(name))score-=180;
  if(page.fromTrustedCategory){matched=true;score+=65}
  return {accepted:matched,score,group:imageGroup(page,topic)};
 }
 function groupOrder(topic){
  if(topic.intent==="books")return ["book","sculpture","portrait","historic","object","technical","artwork","context"];
  if(topic.intent==="artworks")return ["artwork","portrait","sculpture","book","context","historic","object","technical"];
  if(topic.kind==="person")return ["sculpture","portrait","book","context","artwork","historic","object","technical"];
  if(topic.kind==="object")return ["object","historic","book","technical","artwork","context","sculpture","portrait"];
  return ["artwork","object","historic","book","portrait","sculpture","technical","context"];
 }
 function sortImages(items,topic){
  const order=groupOrder(topic);
  return [...items].sort((a,b)=>order.indexOf(a.group)-order.indexOf(b.group)||b.score-a.score||a.name.localeCompare(b.name));
 }
 function previewImages(items,topic){
  const chosen=[],seen=new Set();
  const order=groupOrder(topic);
  for(const group of order){
   const limit=group==="sculpture"||group==="portrait"||group==="object"||group==="historic"?2:1;
   for(const item of items.filter(x=>x.group===group).slice(0,limit))if(chosen.length<5){chosen.push(item);seen.add(item.page)}
  }
  for(const item of items)if(chosen.length<5&&!seen.has(item.page)){chosen.push(item);seen.add(item.page)}
  return sortImages(chosen,topic);
 }
 function parseExtract(raw){
  const blocks=[];let buffer=[];
  const flush=()=>{const text=buffer.join(" ").replace(/\s+/g," ").trim();buffer=[];if(text)blocks.push({type:"paragraph",text})};
  for(const line of String(raw||"").split(/\r?\n/)){
   const text=line.trim(),heading=text.match(/^(={2,6})\s*(.+?)\s*\1$/);
   if(heading){flush();blocks.push({type:"heading",text:heading[2],level:heading[1].length})}
   else if(!text)flush();else buffer.push(text);
  }
  flush();return blocks;
 }
 window.VitruviaDiscovery={plan,imageRank,sortImages,previewImages,groupOrder,groups,parseExtract,plain};
})();
