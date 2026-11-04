/* Cloudflare Pages Function — optional deployment, NOT executed by GitHub Pages.
 * Configure GROK_API_KEY and AI_MODEL server-side, never in client JS.
 */
const origin="https://diegoalonsok-png.github.io/vitruvius-digital-library";
const result=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const norm=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
async function fetchData(path){const r=await fetch(origin+path);if(!r.ok)throw Error("Source unavailable: "+path);return r.json()}
export async function onRequestPost({request,env}){
 if(!env.GROK_API_KEY||!env.AI_MODEL)return result({error:"Backend de IA no configurado",code:"AI_NOT_CONFIGURED"},503);
 let body;try{body=await request.json()}catch{return result({error:"JSON inválido"},400)}
 const query=String(body.query||"").trim().slice(0,160);
 if(query.length<2)return result({error:"Consulta demasiado corta"},400);
 let corpus=[],bibliography=[];
 try{const d=await fetchData("/data/vitruvius-chunks.json");corpus=d.chunks||[]}catch{}
 try{const d=await fetchData("/bibliografia.json");bibliography=d.entries||[]}catch{}
 const key=norm(query);
 const passages=corpus.filter(c=>norm((c.texto||"")+" "+(c.traduccion||"")).includes(key)).slice(0,8);
 const books=bibliography.filter(b=>norm([b.titulo,b.autor,b.signatura,b.descripcion].join(" ")).includes(key)).slice(0,8);
 const sources=[
 ...passages.map((p,i)=>({id:"T"+(i+1),locus:p.locus,edition:p.edicion,latin:(p.texto||"").slice(0,900),translation:(p.traduccion||"").slice(0,900),url:p.lector})),
 ...books.map((b,i)=>({id:"B"+(i+1),title:b.titulo||b.signatura||b.id,year:b.fecha||null,url:b.local_url||b.digital||null}))
 ];
 const messages=[
 {role:"system",content:"Write an extensive but evidence-aware academic encyclopedia article in Spanish with sections, primary literature, history, scholarship and images to investigate. Distinguish primary sources from interpretations. Only cite supplied records as [T1] or [B1], never fabricate folios, pages, DOI, or reviewed papers; state explicitly where evidence is insufficient. Do not falsely imply image retrieval or Google search."},
 {role:"user",content:JSON.stringify({query,sources})}
 ];
 let upstream;try{
  upstream=await fetch("https://api.x.ai/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+env.GROK_API_KEY,"content-type":"application/json"},body:JSON.stringify({model:env.AI_MODEL,messages,temperature:0.2})});
 }catch{return result({error:"Proveedor de IA inaccesible"},502)}
 if(!upstream.ok)return result({error:"Proveedor de IA rechazó la solicitud",status:upstream.status},502);
 const d=await upstream.json();
 return result({title:query,content:d.choices?.[0]?.message?.content||"",sources,generated:true,notice:"Síntesis automática. Corroborar referencias en originales."});
}