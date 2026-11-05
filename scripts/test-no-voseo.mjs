// Textos visibles del sitio en castellano neutro: impide reintroducir formas de voseo.
import {readFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
const files=execSync("git ls-files '*.html' 'assets/*.js' 'assets/*.mjs' 'gemini-service/*.js'",{encoding:'utf8'}).split('\n').filter(Boolean);
const forms=/(?<![\p{L}])(usá|Usá|consultá|Consultá|elegí|Elegí|elegís|buscá|Buscá|probá|Probá|abrí|Abrí|escribí|Escribí|hacé|Hacé|podés|Podés|querés|tenés|Tenés|registrá|seleccioná|Seleccioná|intentá|Intentá|desplazate|Desplazate|cargala|descargala|Descargala|subí|Subí|ingresá|Ingresá|copiá|Copiá|volvé|Volvé|mirá|Mirá|tocá|Tocá|preguntá|Preguntá|decí|Decí|poné|Poné|fijate|Fijate|sabés|guardá|Guardá|cerrá|Cerrá|empezá|Empezá|activá|Activá|compartí|Compartí|hablá|Hablá|dictá|Dictá|mostrá|Mostrá|escuchá|Escuchá|leé|Leé|pedí|Pedí|vení|Vení|andá|Andá|esperá|Esperá|necesitás|tocás|elegilo|Elegilo|probalo|Probalo|arrastrá|Arrastrá|pegá|Pegá|completá|Completá|revisá|Revisá|verificá|Verificá|agregá|Agregá|cambiá|Cambiá)(?![\p{L}])/u;
const bad=[];
for(const f of files){const lines=readFileSync(f,'utf8').split('\n');lines.forEach((l,i)=>{const m=l.match(forms);if(m)bad.push(f+':'+(i+1)+' «'+m[0]+'»')})}
if(bad.length){console.error('Formas de voseo en textos del sitio:\n'+bad.join('\n'));process.exit(1)}
console.log('Sin formas de voseo en '+files.length+' archivos.');
