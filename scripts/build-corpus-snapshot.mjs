#!/usr/bin/env node
/* Publish a new dated snapshot; never overwrite the historical snapshot. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const date=process.argv[2]||new Date().toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Expected YYYY-MM-DD');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const previous=read('data/corpus-snapshot-2026-11-14.json');
const manifest=read('data/structured/manifest.json'),integrity=read('data/academic-integrity.json');
const snapshot=structuredClone(previous),objects=[];
snapshot.recorded_on=date;snapshot.source_commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
for(const record of snapshot.records){
 const bytes=fs.readFileSync(record.path),object=JSON.parse(bytes),meta=manifest.editions.find(x=>x.version===record.edition);
 record.git_blob_sha1=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 record.source_docx_sha256=meta.source.sha256;record.passage_blocks=object.passages.length;objects.push(object);
}
snapshot.source_fingerprint_sha256=createHash('sha256').update(JSON.stringify(objects)).digest('hex');
if(snapshot.source_fingerprint_sha256!==integrity.sourceFingerprint)throw Error('Editorial integrity fingerprint must be reconciled first');
snapshot.previous_snapshot='data/corpus-snapshot-2026-11-14.json';
snapshot.citation=`Kurilo, Diego. Vitruvius Digital Library: registro de procedencia y versiones del corpus (${date}), commit ${snapshot.source_commit}.`;
const target='data/corpus-snapshot-'+date+'.json';
if(fs.existsSync(target)&&fs.readFileSync(target,'utf8')!==JSON.stringify(snapshot,null,2)+'\n')throw Error('A dated snapshot already exists; preserve it and choose a new version identifier');
fs.writeFileSync(target,JSON.stringify(snapshot,null,2)+'\n');
fs.writeFileSync('data/corpus-snapshot-current.json',JSON.stringify({schema:'vdl-current-corpus-snapshot-v1',path:target,previous: snapshot.previous_snapshot},null,2)+'\n');
console.log(target);
