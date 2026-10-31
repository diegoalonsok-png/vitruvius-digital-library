// Optional Cloudflare Worker: deploy only with an eligible FREE Gemini API key.
// Secrets: GEMINI_API_KEY and ACCESS_TOKEN. Neither is committed to GitHub.
// Do not publish an unauthenticated public Gemini proxy.
const ORIGIN='https://diegoalonsok-png.github.io';
const PROMPT='Transcribí diplomáticamente el latín visible de este folio de un manuscrito de Vitruvio del siglo IX. Respetá saltos de línea, ortografía medieval, letras realmente visibles y abreviaturas. Marcá [ilegible] y [?] donde haya dudas. No traduzcas. No uses el texto conocido de Krohn para reconstruir o completar palabras. Devolvé exclusivamente el texto latino con saltos de línea; nunca inventes lecturas.';
function cors(){return {'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'Content-Type, X-Scriptorium-Token','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};}
export default {async fetch(request,env){
 const headers=cors();
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return new Response('Use POST',{status:405,headers});
 if(request.headers.get('Origin')!==ORIGIN)return new Response('Origen no permitido',{status:403,headers});
 if(!env.GEMINI_API_KEY||!env.ACCESS_TOKEN)return Response.json({error:'Servicio no configurado'}, {status:503,headers});
 if(request.headers.get('X-Scriptorium-Token')!==env.ACCESS_TOKEN)return Response.json({error:'Acceso no autorizado'}, {status:401,headers});
 const len=Number(request.headers.get('Content-Length')||0);
 if(len>9000000)return Response.json({error:'Archivo demasiado grande'}, {status:413,headers});
 try {
 const form=await request.formData(),file=form.get('image');
 if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>6000000)return Response.json({error:'Subí JPG/PNG/WebP de menos de 6 MB'}, {status:400,headers});
 const bytes=new Uint8Array(await file.arrayBuffer());
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const data=btoa(binary);
 const model='gemini-2.5-flash';
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:PROMPT},{inlineData:{mimeType:file.type,data}}]}],generationConfig:{temperature:0.1,maxOutputTokens:4096}})});
 const payload=await response.json();
 if(!response.ok)return Response.json({error:'Gemini: '+(payload.error?.message||response.status)}, {status:502,headers});
 const text=(payload.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').trim();
 return Response.json({text,engine:'Gemini',status:'automatic_unreviewed',model}, {headers});
 }catch(e){return Response.json({error:'No se pudo procesar la imagen'}, {status:500,headers});}
}};
