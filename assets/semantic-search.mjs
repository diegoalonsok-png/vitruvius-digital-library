// Optional semantic search. Never loaded by the main search until explicitly enabled.
// Embeddings are produced with scripts/build-embeddings.py from the aligned passages.
const INDEX_URL = 'data/embeddings-e5-small-index.json';
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
let resourcesPromise;

async function resources() {
  if (!resourcesPromise) resourcesPromise = (async () => {
    const response = await fetch(INDEX_URL);
    if (!response.ok) throw Error('El índice semántico todavía no está publicado.');
    const index = await response.json();
    if (index.schema !== 1 || index.dtype !== 'int8' || index.model !== 'intfloat/multilingual-e5-small') {
      throw Error('Índice semántico incompatible con el modelo.');
    }
    const matrixResponse = await fetch(new URL(index.matrix, new URL(INDEX_URL, location.href)));
    if (!matrixResponse.ok) throw Error('No se pudo descargar la matriz semántica.');
    const matrix = new Int8Array(await matrixResponse.arrayBuffer());
    if (matrix.length !== index.rows.length * index.dimensions) throw Error('Dimensiones incompatibles del índice semántico.');
    const {pipeline} = await import(TRANSFORMERS_URL);
    const embed = await pipeline('feature-extraction', index.runtime_model, {dtype:'q8'});
    return {index, matrix, embed};
  })().catch(error => { resourcesPromise = null; throw error; });
  return resourcesPromise;
}

function cosineQuantized(query, matrix, index, row) {
  const size = index.dimensions, offset = row * size;
  let score = 0;
  for(let i=0;i<size;i++) score += query[i]*matrix[offset+i];
  return score / 127;
}

export async function findRelatedLoci(query, limit = 10) {
  const {index, matrix, embed} = await resources();
  const output = await embed('query: ' + query, {pooling:'mean', normalize:true});
  const vector = output.data;
  const byLocus = new Map();
  for(let i=0;i<index.rows.length;i++) {
    const row=index.rows[i], score=cosineQuantized(vector,matrix,index,i);
    const key=row.type==='critical_note'?row.edition+':note:'+row.note_id:row.locus;
    const current=byLocus.get(key);
    if(!current || score>current.score) byLocus.set(key,{...row,score});
  }
  return [...byLocus.values()].sort((a,b)=>b.score-a.score).slice(0,limit);
}

export function installSemanticSearch(form, input) {
  const label = document.createElement('label');
  label.className = 'semantic-optin';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'semantic-enabled';
  label.append(checkbox, document.createTextNode(' Pasajes relacionados (búsqueda semántica)'));
  const result = document.createElement('section');
  result.id='semantic-results';
  result.hidden=true;
  result.setAttribute('aria-live','polite');
  // Reuse existing form and typography; no layout or style overrides.
  form.after(result);
  form.append(label);
  let serial=0;
  form.addEventListener('submit', () => {
    ++serial;
    const seq=serial, query=input.value.trim();
    result.replaceChildren();
    result.hidden=!checkbox.checked;
    if(!checkbox.checked || !query) return;
    const heading=document.createElement('h3');
    heading.textContent='Pasajes relacionados (búsqueda semántica)';
    const status=document.createElement('p');
    status.textContent='Consultando el modelo multilingüe…';
    result.append(heading,status);
    findRelatedLoci(query).then(rows=>{
      if(seq!==serial)return;
      status.textContent='Resultados orientativos: verificar cada cita en el texto latino.';
      const list=document.createElement('ol');
      for(const row of rows) {
        const item=document.createElement('li'), link=document.createElement('a');
        link.href='lector-bilingue.html?edition='+encodeURIComponent(row.edition==='theory-en'?'theory-en':'recensio-es')+'&locus='+encodeURIComponent(row.locus);
        link.textContent='Vitr., De arch. '+row.locus+' · '+row.language.toUpperCase();
        item.append(link);list.append(item);
      }
      result.append(list);
    }).catch(error=>{if(seq===serial)status.textContent=error.message;});
  });
}
