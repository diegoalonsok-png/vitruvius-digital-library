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
  const qRaw=fold(query);
  const colorRequested=/\b(?:a color|en color|colores|colour|color|coloured|colored|couleur|couleurs)\b/.test(qRaw)
   && !/\b(?:sin color|no color|blanco y negro|black and white|monochrome|monocromo)\b/.test(qRaw);
  const genericColor=/^(?:(?:ejemplo|ejemplos|mostrar|ver|buscar)\s+)?(?:(?:imagenes|fotos|fotografias|images|photos|pictures)(?:\s+(?:a|en|de))?\s+)?(?:color|colores|colour|colored|coloured|couleur)(?:\s+(?:imagenes|images|fotos|photos))?$/.test(qRaw);
  const rawSubject=identity.canonical||query;
  const subject=genericColor?"Color photography":rawSubject;
  const terms=unique([fold(subject),fold(query),...(identity.aliases||[]).map(fold)]);
  const description=fold(identity.authorityDescription||identity.description);
  let family=families.find(f=>f.aliases.some(a=>terms.includes(a)));
  if(!family&&/\b(cafetera|coffee maker|coffeemaker|cafetiere)\b/.test(description))family=families[0];
  if(!family&&/\b(utensilio de cocina|cooking utensil|cookware|ustensile de cuisine)\b/.test(description))family=families[1];
  const person=identity.kind==="person"||identity.instanceOf?.includes("Q5")||(!identity.kind&&peopleWords.test(description));
  const musicalGroup=!person&&(identity.instanceOf||[]).some(id=>["Q215380","Q5741069","Q2088357"].includes(id))||!person&&/\b(rock band|musical group|music group|musical ensemble|banda de rock|grupo musical|groupe de musique|groupe de rock|pop band|banda musical)\b/.test(description);
  const kind=family?"object":person?"person":musicalGroup?"music-group":objectWords.test(description)?"object":"topic";
  const q=fold(query);
  const intent=/\b(pinturas|cuadros|paintings|artworks|tableaux)\b/.test(q)?"artworks":/\b(bustos|busts|esculturas|sculptures)\b/.test(q)?"sculptures":/\b(libros|books|manuscritos|manuscripts)\b/.test(q)?"books":"overview";
  const brutalism=/\b(brutalist|brutalism|brutalista|brutalismo|beton brut)\b/.test(qRaw+" "+description);
  const visualName=genericColor?subject:identity.commonsSearchName||identity.originalCanonical||subject;
  let aliases=unique([subject,visualName,...(identity.aliases||[])]);
  let queries=intent==="artworks"?[visualName+" painting",visualName+" artwork",query]:
   intent==="sculptures"?[visualName+" bust",visualName+" sculpture",query]:
   intent==="books"?[visualName+" book",visualName+" manuscript",query]:
   kind==="person"?(typeof identity.birthYear==="number"&&identity.birthYear>=1800?[visualName+" portrait photograph",visualName+" photographer",visualName+" at work",visualName,subject]:[visualName+" bust",visualName+" portrait painting",visualName+" book manuscript",visualName,subject]):
   kind==="music-group"?[visualName+" band live concert",visualName+" band members",visualName+" performing",visualName+" group photograph",visualName]:
   kind==="object"?[visualName,visualName+" museum historic",visualName+" history book",subject]:[visualName,subject,query];
  if(brutalism&&kind==="topic"){
   aliases=unique([...aliases,"brutalist architecture","brutalism","brutalist","brutalismo","brutalista"]);
   queries=unique(["brutalist architecture building color photograph","brutalist architecture concrete buildings","brutalism building architecture photography","brutalist architecture",...queries]);
  }else if(genericColor){
   aliases=["color photography","colour photography","color photograph","color photo","colorful photography","color"];
   queries=["color photography","colour photographs","color photos architecture","colorful photography","color photographs"];
  }else if(colorRequested&&kind==="topic"){
   queries=unique([visualName+" color photograph",visualName+" colour photography",...queries]);
  }
  const visualStyle=colorRequested||genericColor?"color":brutalism?"prefer-color":"any";
  return {kind,intent,subject,aliases,queries:unique(queries).slice(0,5),visualStyle,family:family?.id||null,
   contextTitles:family?.topics||null,ancient:typeof identity.birthYear==="number"&&identity.birthYear<0};
 }
 const groups={
  sculpture:{es:"Bustos y esculturas",en:"Busts and sculptures",fr:"Bustes et sculptures"},
  portrait:{es:"Retratos, cuadros y grabados",en:"Portraits, paintings and engravings",fr:"Portraits, tableaux et gravures"},
  book:{es:"Libros, manuscritos y ediciones",en:"Books, manuscripts and editions",fr:"Livres, manuscrits et éditions"},
  object:{es:"El objeto y sus tipos",en:"The object and its types",fr:"L’objet et ses types"},
  historic:{es:"Ejemplares históricos y colecciones",en:"Historic examples and collections",fr:"Exemplaires historiques et collections"},
  technical:{es:"Funcionamiento, planos y diagramas",en:"Operation, plans and diagrams",fr:"Fonctionnement, plans et schémas"},
  live:{es:"Fotografías de la banda y conciertos",en:"Band photographs and concerts",fr:"Photographies du groupe et concerts"},
  artwork:{es:"Obras y representaciones artísticas",en:"Artworks and artistic representations",fr:"Œuvres et représentations artistiques"},
  context:{es:"Otras imágenes relacionadas",en:"Other related images",fr:"Autres images liées"}
 };
 const bust=/\b(bust|busts|busto|bustos|buste|bustes|sculpture|sculptures|scultura|escultura|esculturas|statue|statues|estatua|herm|herma|marble head|portrait head)\b/;
 const portrait=/\b(portrait|portraits|retrato|retratos|painting|paintings|pintura|pinturas|fresco|frescos|engraving|engravings|grabado|grabados|woodcut|lithograph|drawing|dibujo|photograph|photography|foto|photo|raffae?l+o?|sanzio)\b/;
 const book=/\b(book|books|libro|libros|manuscript|manuscripts|manuscrit|codex|codices|incunabul\w*|frontispiece|frontispicio|title page|treatise|scan|scanned|djvu|bibliotheca|de vita)\b/;
 const technical=/\b(theorem|teorema|diagram|diagrams|diagrama|triang\w*|geometry|geometria|geometric|formula|demonstration|patent|patente|schematic|section drawing)\b/;
 function imageGroup(page,topic){
  if(topic.kind==="music-group"){
   const filename=fold(page.title||"");
   if(/\b(logo|wordmark|emblem|symbol|icon|vector|svg|cd single|disc|vinyl|album cover|album art|cover art|sleeve|poster|typography)\b/.test(filename))return "context";
   if(/\b(concert|live|performing|performance|stage|band members|group photo|band photo|photograph|photo|festival|tour)\b/.test(filename+" "+fold(page.sourceCategory||"")))return "live";
   return "historic";
  }
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
   // Las palabras del título buscado deben aparecer juntas y en orden (máximo dos palabras intercaladas):
   // «Contra Celso» no acepta «Celso Giannazi – Contra o desmonte…» ni «Contra-almirante… Celso Amorim».
   const near=text=>{const t=text.split(" ");let pos=-1;for(const w of words){let k=-1;for(let i=pos+1;i<t.length;i++)if(t[i]===w){k=i;break}
     if(k<0||(pos>=0&&k-pos>3))return false;pos=k}return true};
   const complete=words.length>1&&near(name);
   if(inName||inDescription||complete){matched=true;score=Math.max(score,(inName?120:0)+(complete?70:0)+(inDescription?25:0))}
  }
  // Only entity images and subject-specific collections may bypass a title match.
  if(page.fromEntityImage){matched=true;score+=160}
  const institution=plain(meta.Institution?.value||meta.Credit?.value||"");
  if(/museum|museo|musee|british library|bibliotheque|metropolitan|hermitage|uffizi|louvre|capitolini/i.test(institution+" "+name))score+=25;
  if(/\b(surgical mask|face mask|mascarilla|meme|parody|parodia|souvenir)\b/.test(name))score-=180;
  if(page.fromTrustedCategory){matched=true;score+=65}
  if(topic.visualStyle==="color"||topic.visualStyle==="prefer-color"){
   const visualText=name+" "+description;
   if(/\b(?:black and white|black white|grayscale|greyscale|monochrome|monochromatic|schwarzweiss|noir et blanc|blanco y negro|sepia|bnw)\b/.test(visualText))score-=topic.visualStyle==="color"?260:160;
   if(/\b(?:colour|color|colourful|colorful|polychrome|polychromatic|in colour|in color)\b/.test(visualText))score+=65;
   if(/\b(?:photograph|photo|fotografia|photography|building|buildings|facade|facades|architecture|arquitectura)\b/.test(visualText))score+=20;
  }
  if(topic.kind==="music-group"){
   const file=fold(page.title||"");
   if(/\b(concert|live|performing|band members|group photo|band photo|festival|tour|photograph|photo)\b/.test(file))score+=130;
   if(/\b(logo|wordmark|emblem|icon|vector|cd single|disc|album cover|cover art|sleeve|typography)\b/.test(file))score-=170;
  }
  return {accepted:matched,score,group:imageGroup(page,topic)};
 }
 function groupOrder(topic){
  if(topic.intent==="books")return ["book","sculpture","portrait","historic","object","technical","artwork","context"];
  if(topic.intent==="artworks")return ["artwork","portrait","sculpture","book","context","historic","object","technical"];
  if(topic.kind==="person")return ["sculpture","portrait","book","context","artwork","historic","object","technical"];
  if(topic.kind==="music-group")return ["live","historic","artwork","book","context","portrait","object","technical","sculpture"];
  if(topic.kind==="object")return ["object","historic","book","technical","artwork","context","sculpture","portrait"];
  return ["artwork","object","historic","book","portrait","sculpture","technical","context"];
 }
 function sortImages(items,topic){
  // Dated reproductions precede undated ones. Never mistake an upload date for
  // the creation, publication or filming date of a historical work.
  const order=groupOrder(topic);
  const validYear=x=>Number.isFinite(x)&&x>=-4000&&x<=new Date().getFullYear()+1;
  return [...items].sort((a,b)=>{
   if(topic.kind==="music-group"||topic.visualStyle==="color"||topic.visualStyle==="prefer-color")
    return b.score-a.score||order.indexOf(a.group)-order.indexOf(b.group)||a.name.localeCompare(b.name);
   const ay=validYear(a.year)?a.year:null,by=validYear(b.year)?b.year:null;
   if(ay!==null&&by!==null&&ay!==by)return ay-by;
   if(ay!==null&&by===null)return -1;
   if(ay===null&&by!==null)return 1;
   return order.indexOf(a.group)-order.indexOf(b.group)||b.score-a.score||a.name.localeCompare(b.name);
  });
 }
 function previewImages(items,topic){
  // The first five images preserve the same chronological sequence as the gallery.
  if(topic.kind==="music-group"){
   const photos=sortImages(items.filter(item=>item.group==="live"||item.group==="historic"),topic);
   const other=sortImages(items.filter(item=>item.group!=="live"&&item.group!=="historic"),topic);
   return [...photos,...other].slice(0,5);
  }
  return sortImages(items,topic).slice(0,5);
 }
 /* Scholarly list entries must not be collapsed into an uninterrupted paragraph.
    Keep each source's punctuation and wording intact; only recover boundaries. */
 function splitBibliographyEntries(value){
  const source=String(value||"").replace(/\s+/g," ").trim();
  if(!source)return [];
  // The Wikipedia plain-text extract sometimes joins all bibliography entries
  // with spaces. A new surname/author/year record or repeat-author dash is a
  // trustworthy editorial boundary, unlike every full stop or ISBN.
  const record=/(?:\p{Lu}[\p{L}’'-]+(?:\s+(?:\p{Lu}[\p{L}’'-]+|de|del|la|las|los|y|van|von)){0,6}\s*,\s*\p{Lu}[\p{L}’'-]+(?:\s+\p{Lu}[\p{L}’'-]+){0,5}\s*(?:\((?:1[5-9]\d{2}|20\d{2})\)|,\s*(?:ed|dir|coord)\.)|[—–]\s*\((?:1[5-9]\d{2}|20\d{2})\))/gu;
  const starts=[];
  for(const found of source.matchAll(record)){
   const before=source.slice(0,found.index).trimEnd();
   // Avoid splitting on names appearing in the middle of a book title.
   if(before&&!/[.!?;]$/.test(before))continue;
   starts.push(found.index);
  }
  if(starts.length<2)return [source];
  if(starts[0]!==0)starts.unshift(0);
  return starts.map((from,i)=>source.slice(from,starts[i+1]??source.length).trim()).filter(Boolean);
 }
 function parseExtract(raw){
  const blocks=[];let buffer=[],bibliography=false;
  const bibliographyHeading=heading=>/^(?:bibliograf[ií]a(?:\s|$)|referencias(?:\s+bibliogr[aá]ficas)?$|bibliography$|references$|works cited$|bibliographie$|literaturverzeichnis$|fuentes citadas$)/i.test(heading);
  const flush=()=>{
   const content=buffer.join(" ").replace(/\s+/g," ").trim();
   buffer=[];
   if(!content)return;
   if(bibliography){
    for(const entry of splitBibliographyEntries(content))blocks.push({type:"bibliography-item",text:entry});
   }else blocks.push({type:"paragraph",text:content});
  };
  for(const line of String(raw||"").split(/\r?\n/)){
   const text=line.trim(),heading=text.match(/^(={2,6})\s*(.+?)\s*\1$/);
   if(heading){
    flush();bibliography=bibliographyHeading(heading[2].trim());
    blocks.push({type:"heading",text:heading[2],level:heading[1].length});
   }else if(!text)flush();
   else if(bibliography&&/^(?:[*•]\s+|\d+[.)]\s+)/.test(text)){
    flush();buffer.push(text.replace(/^(?:[*•]\s+|\d+[.)]\s+)/,""));
   }else buffer.push(text);
  }
  flush();return blocks;
 }
 window.VitruviaDiscovery={plan,imageRank,sortImages,previewImages,groupOrder,groups,parseExtract,plain};
})();
