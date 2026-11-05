/* Codex H folio reader: translate the actual interface without translating manuscript data.
   UI languages: ES, EN, FR, IT, DE, PT. No external translation calls. */
(()=>{'use strict';
 const codes=['es','en','fr','it','de','pt'];
 const entries=[
 // Spanish source, English, French, Italian, German, Portuguese
 ['← Biblioteca principal','← Main library','← Bibliothèque principale','← Biblioteca principale','← Hauptbibliothek','← Biblioteca principal'],
 ['Scriptorium histórico','Historical scriptorium','Scriptorium historique','Scriptorium storico','Historisches Skriptorium','Scriptorium histórico'],
 ['Visor IIIF existente','Existing IIIF viewer','Visionneuse IIIF existante','Visore IIIF esistente','Vorhandener IIIF-Viewer','Visualizador IIIF existente'],
 ['Codex H · Folios','Codex H · Folios','Codex H · Folios','Codex H · Fogli','Codex H · Blätter','Codex H · Fólios'],
 ['. The British Library, Harley MS 2767, primer cuarto del siglo IX. Galería local ordenada según la secuencia y las etiquetas originales de su digitalización.','. The British Library, Harley MS 2767, first quarter of the ninth century. Local gallery following the original digitisation sequence and labels.','. The British Library, Harley MS 2767, premier quart du IXe siècle. Galerie locale suivant la séquence et les libellés d’origine de la numérisation.','. The British Library, Harley MS 2767, primo quarto del IX secolo. Galleria locale secondo la sequenza e le etichette originali della digitalizzazione.','. The British Library, Harley MS 2767, erstes Viertel des 9. Jahrhunderts. Lokale Galerie in der Reihenfolge und mit den Originalbezeichnungen der Digitalisierung.','. The British Library, Harley MS 2767, primeiro quartel do século IX. Galeria local na sequência e com as legendas originais da digitalização.'],
 ['Identificación académica:','Academic identification:','Identification académique :','Identificazione accademica:','Wissenschaftliche Identifikation:','Identificação acadêmica:'],
 ['el número de imagen digital no equivale necesariamente al número de folio. Las cubiertas y guardas conservan su posición original;','the digital image number does not necessarily equal the folio number. Covers and flyleaves retain their original positions;','le numéro de l’image numérique ne correspond pas nécessairement au numéro du folio. Les couvertures et gardes conservent leur position d’origine ;','il numero dell’immagine digitale non corrisponde necessariamente al numero del foglio. Copertine e carte di guardia mantengono la posizione originale;','die digitale Bildnummer entspricht nicht zwangsläufig der Folionummer. Einband und Vorsatzblätter behalten ihre ursprüngliche Position;','o número da imagem digital não corresponde necessariamente ao número do fólio. Capas e folhas de guarda mantêm a posição original;'],
 ['corresponde a la imagen digital 9 del manifiesto.','corresponds to digital image 9 in the manifest.','correspond à l’image numérique 9 du manifeste.','corrisponde all’immagine digitale 9 del manifesto.','entspricht dem digitalen Bild 9 im Manifest.','corresponde à imagem digital 9 do manifesto.'],
 ['Comprobando que la colección de fotografías esté publicada en GitHub…','Checking that the photographic collection is published on GitHub…','Vérification de la publication de la collection photographique sur GitHub…','Verifica della pubblicazione della raccolta fotografica su GitHub…','Prüfe, ob die Bildsammlung auf GitHub veröffentlicht ist…','Verificando se a coleção fotográfica está publicada no GitHub…'],
 ['Leer el códice en grande','Read the codex enlarged','Lire le codex en grand','Leggere il codice ingrandito','Kodex vergrößert lesen','Ler o códice ampliado'],
 ['← Anterior','← Previous','← Précédent','← Precedente','← Zurück','← Anterior'],
 ['Siguiente →','Next →','Suivant →','Successivo →','Weiter →','Próximo →'],
 ['Imagen','Image','Image','Immagine','Bild','Imagem'],
 ['Elegir folio','Choose folio','Choisir un folio','Scegli foglio','Folio wählen','Escolher fólio'],
 ['Cargando los folios…','Loading folios…','Chargement des folios…','Caricamento dei fogli…','Lade Folios…','Carregando fólios…'],
 ['Zoom','Zoom','Zoom','Zoom','Zoom','Zoom'],
 ['+ Ampliar','+ Enlarge','+ Agrandir','+ Ingrandisci','+ Vergrößern','+ Ampliar'],
 ['Ajustar','Fit','Ajuster','Adatta','Einpassen','Ajustar'],
 ['La galería se abrirá cuando se verifique el archivo maestro.','The gallery will open once the master archive has been verified.','La galerie s’ouvrira après vérification de l’archive maîtresse.','La galleria si aprirà dopo la verifica dell’archivio principale.','Die Galerie öffnet sich nach Prüfung des Masterarchivs.','A galeria abrirá após a verificação do arquivo principal.'],
 ['Haz clic en la imagen para ampliar la zona señalada. Desplázate por el visor con las barras horizontal y vertical.','Click the image to enlarge the selected area. Scroll horizontally and vertically to explore the folio.','Cliquez sur l’image pour agrandir la zone choisie. Faites défiler horizontalement et verticalement.','Fai clic sull’immagine per ingrandire l’area selezionata. Scorri orizzontalmente e verticalmente per esplorare il foglio.','Klicken Sie auf das Bild, um einen Bereich zu vergrößern. Nutzen Sie die horizontalen und vertikalen Bildlaufleisten.','Clique na imagem para ampliar a área selecionada. Use as barras de rolagem horizontal e vertical.'],
 ['Buscar por imagen · Galería visual del Codex H','Search by image · Codex H visual gallery','Recherche par image · Galerie du Codex H','Ricerca per immagine · Galleria del Codex H','Bildsuche · Bildergalerie des Codex H','Buscar por imagem · Galeria visual do Codex H'],
 ['Todos los folios en orden digital y con sus etiquetas IIIF originales. Selecciona una miniatura para leerla arriba.','All folios in digital order with their original IIIF labels. Select a thumbnail to view it above.','Tous les folios en ordre numérique avec leurs étiquettes IIIF d’origine. Sélectionnez une miniature pour la voir ci-dessus.','Tutti i fogli in ordine digitale e con le etichette IIIF originali. Seleziona una miniatura per visualizzarla sopra.','Alle Folios in digitaler Reihenfolge mit den ursprünglichen IIIF-Bezeichnungen. Wählen Sie ein Vorschaubild.','Todos os fólios em ordem digital com os rótulos IIIF originais. Selecione uma miniatura para ver acima.'],
 ['Mostrar todas','Show all','Tout afficher','Mostra tutte','Alle anzeigen','Mostrar todas'],
 ['Comprobando índice…','Checking index…','Vérification de l’index…','Verifica dell’indice…','Prüfe Verzeichnis…','Verificando índice…'],
 ['Mostrar más folios','Show more folios','Afficher plus de folios','Mostra altri fogli','Weitere Folios anzeigen','Mostrar mais fólios'],
 ['Créditos institucionales:','Institutional credits:','Crédits institutionnels :','Crediti istituzionali:','Institutionelle Bildnachweise:','Créditos institucionais:'],
 ['manifiesto IIIF institucional','institutional IIIF manifest','manifeste IIIF institutionnel','manifesto IIIF istituzionale','institutionelles IIIF-Manifest','manifesto IIIF institucional'],
 ['Digitalización y etiquetas de folio procedentes del','Digitisation and folio labels from the','Numérisation et étiquettes des folios issues du','Digitalizzazione ed etichette dei fogli tratte dal','Digitalisierung und Folio-Bezeichnungen aus dem','Digitalização e etiquetas dos fólios provenientes do'],
 ['. Condiciones citadas por el proveedor: «Public Domain in most countries, other than the UK»; deben respetarse las condiciones aplicables.','. Provider’s terms: “Public Domain in most countries, other than the UK”; applicable conditions must be respected.','. Conditions indiquées par le fournisseur : « Public Domain in most countries, other than the UK » ; les conditions applicables doivent être respectées.','. Condizioni indicate dal fornitore: «Public Domain in most countries, other than the UK»; rispettare le condizioni applicabili.','. Hinweis des Anbieters: „Public Domain in most countries, other than the UK“; geltende Bedingungen sind einzuhalten.','. Condições indicadas pelo fornecedor: «Public Domain in most countries, other than the UK»; respeite as condições aplicáveis.'],
 ['El repositorio conserva los nombres originales, la correspondencia de imagen y la huella SHA-256. No se presenta una equivalencia entre folios y loci sin cotejo.','The repository preserves the original filenames, image mappings and SHA-256 checksums. Folio–locus mappings are not claimed without verification.','Le dépôt conserve les noms d’origine, les correspondances d’images et les empreintes SHA-256. Aucune équivalence folio–locus n’est affirmée sans collation.','Il repository conserva nomi originali, corrispondenze delle immagini e impronte SHA-256. Non si afferma alcuna corrispondenza foglio–locus senza verifica.','Das Repository bewahrt Originalnamen, Bildzuordnungen und SHA-256-Prüfsummen. Folio–Locus-Zuordnungen werden ohne Prüfung nicht behauptet.','O repositório preserva nomes originais, correspondência de imagens e verificações SHA-256. Não se afirma equivalência entre fólios e loci sem cotejo.'],
 ['◉ Desactivar lupa','◉ Disable magnifier','◉ Désactiver la loupe','◉ Disattiva lente','◉ Lupe deaktivieren','◉ Desativar lupa'],
 ['◉ Activar lupa','◉ Enable magnifier','◉ Activer la loupe','◉ Attiva lente','◉ Lupe aktivieren','◉ Ativar lupa'],
 ['⎙ Imprimir','⎙ Print','⎙ Imprimer','⎙ Stampa','⎙ Drucken','⎙ Imprimir'],
 ['✉ Correo','✉ Email','✉ Courriel','✉ Email','✉ E-Mail','✉ E-mail'],
 ['Bajar por el folio','Scroll through folio','Parcourir le folio','Scorri il foglio','Im Folio scrollen','Rolar pelo fólio'],
 ['Ajustes · opacidad, brillo, contraste, inversión, sepia','Settings · opacity, brightness, contrast, inversion, sepia','Réglages · opacité, luminosité, contraste, inversion, sépia','Impostazioni · opacità, luminosità, contrasto, inversione, seppia','Einstellungen · Deckkraft, Helligkeit, Kontrast, Umkehrung, Sepia','Ajustes · opacidade, brilho, contraste, inversão, sépia'],
 ['Opacidad','Opacity','Opacité','Opacità','Deckkraft','Opacidade'],
 ['Brillo','Brightness','Luminosité','Luminosità','Helligkeit','Brilho'],
 ['Contraste','Contrast','Contraste','Contrasto','Kontrast','Contraste'],
 ['Saturación','Saturation','Saturation','Saturazione','Sättigung','Saturação'],
 ['Grises','Grayscale','Niveaux de gris','Scala di grigi','Graustufen','Tons de cinza'],
 ['Sepia','Sepia','Sépia','Seppia','Sepia','Sépia'],
 ['Invertir colores','Invert colors','Inverser les couleurs','Inverti colori','Farben umkehren','Inverter cores'],
 ['Restablecer','Reset','Réinitialiser','Ripristina','Zurücksetzen','Redefinir'],
 ['Claro','Light','Clair','Chiaro','Hell','Claro'],
 ['Oscuro','Dark','Sombre','Scuro','Dunkel','Escuro'],
 ['Folio: —','Folio: —','Folio : —','Foglio: —','Folio: —','Fólio: —']
 ];
 const languageIndex={en:1,fr:2,it:3,de:4,pt:5};
 const dict=new Map(entries.map(([es,...others])=>[es,others]));
 const saved=new WeakMap();
 const exclude='script,style,template,noscript,code,pre,textarea,input,option,[translate="no"],#grid,#folio-quick,#stage,#h-locus,#h-save,.site-typeface-tool,.vr-selection-speech,[lang="la"],[lang="grc"]';
 let lang='es',scheduled=false,updating=false;
 const getLang=()=>{const value=document.getElementById('s-language')?.value||document.documentElement.lang||'es';return codes.includes(value)?value:'es'};
 function dynamicText(source,l){
  const index=languageIndex[l];if(index===undefined)return source;
  const match=source.match(/^Folio:\s*(.+)$/);
  if(match)return ['Folio: ','Folio : ','Foglio: ','Folio: ','Fólio: '][index-1]+match[1];
  const image=source.match(/^Imagen\s+(\d+)(.*)$/);
  if(image)return ['Image ','Image ','Immagine ','Bild ','Imagem '][index-1]+image[1]+image[2];
  const loading=source.match(/^Cargando\s+(.+)…$/);
  if(loading)return ['Loading ','Chargement de ','Caricamento di ','Lade ','Carregando '][index-1]+loading[1]+'…';
  const digits=source.match(/^(\d+)\s+imágenes coincidentes\s+·\s+(\d+)\s+miniaturas visibles$/);
  if(digits)return [
   digits[1]+' matching images · '+digits[2]+' thumbnails shown',
   digits[1]+' images correspondantes · '+digits[2]+' miniatures visibles',
   digits[1]+' immagini corrispondenti · '+digits[2]+' miniature visibili',
   digits[1]+' passende Bilder · '+digits[2]+' Vorschaubilder',
   digits[1]+' imagens correspondentes · '+digits[2]+' miniaturas visíveis'
  ][index-1];
  return source;
 }
 function translation(source,l){const row=dict.get(source);return l==='es'?source:row?row[languageIndex[l]-1]:dynamicText(source,l)}
 function update(){
  scheduled=false;if(updating)return;updating=true;
  try{
   lang=getLang();document.documentElement.lang=lang;
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
   let node;
   while((node=walker.nextNode())){
    if(!node.parentElement||node.parentElement.closest(exclude))continue;
    const raw=node.nodeValue,trim=raw.trim();if(!trim)continue;
    const prev=saved.get(node);let source;
    if(prev&&raw===prev.shown)source=prev.source;
    else source=trim;
    if(!dict.has(source)&&!/^Folio:|^Imagen \d|^Cargando |^\d+ imágenes coincidentes/.test(source)){
      saved.set(node,{source,shown:raw});continue;
    }
    const next=translation(source,lang);
    const changed=raw.slice(0,raw.indexOf(trim))+next+raw.slice(raw.indexOf(trim)+trim.length);
    if(changed!==raw)node.nodeValue=changed;
    saved.set(node,{source,shown:changed});
   }
   const placeholder=document.getElementById('search');
   if(placeholder){
    const hints={
     es:'f. 45v · ff. 12r–14v · Vitr. 3 praef. 1 · symmetria',
     en:'f. 45v · ff. 12r–14v · Vitr. 3 pref. 1 · symmetria',
     fr:'f. 45v · ff. 12r–14v · Vitr. 3 préf. 1 · symmetria',
     it:'f. 45v · ff. 12r–14v · Vitr. 3 pref. 1 · symmetria',
     de:'f. 45v · ff. 12r–14v · Vitr. 3 Vorwort 1 · symmetria',
     pt:'f. 45v · ff. 12r–14v · Vitr. 3 pref. 1 · symmetria'
    };placeholder.placeholder=hints[lang];
   }
  }finally{updating=false}
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update)}}
 function init(){
  if(!document.getElementById('s-language'))return;
  const select=document.getElementById('s-language');
  select.addEventListener('change',schedule);
  const observer=new MutationObserver(records=>{
   if(!updating&&records.some(r=>r.type==='childList'||r.type==='characterData'))schedule();
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
