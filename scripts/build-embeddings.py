#!/usr/bin/env python3
"""Build genuine E5 vectors for the complete author corpus using an offline PyTorch model.

Requires torch, transformers, tokenizers and numpy. The model directory must contain
tokenizer.json and model.safetensors from intfloat/multilingual-e5-small.
Every long paragraph is split with overlap; no tail is silently discarded.
"""
import argparse,hashlib,json,os,time
from pathlib import Path
import numpy as np
os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TRANSFORMERS_OFFLINE']='1'
os.environ['DO_NOT_TRACK']='1'
import torch
from transformers import AutoModel
from tokenizers import Tokenizer
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('model_directory');p.add_argument('--threads',type=int,default=4);args=p.parse_args();model=Path(args.model_directory)
 tokenizer=Tokenizer.from_file(str(model/'tokenizer.json'))
 rows=[];texts=[];corpus_hashes={}
 for edition in ['recensio-es','recensio-fr','theory-en']:
  path=ROOT/f'data/fulltext/{edition}.json';corpus_hashes[edition]=hashlib.sha256(path.read_bytes()).hexdigest();data=json.loads(path.read_text())
  for unit in data['units']:
   text=unit['text']
   if len(text)<35:continue
   encoding=tokenizer.encode(text,add_special_tokens=False)
   offsets=encoding.offsets
   for begin in range(0,len(offsets),290):
    end=min(len(offsets),begin+330);start_char=offsets[begin][0];end_char=offsets[end-1][1]
    rows.append({'edition':edition,'unit_id':unit['id'],'locus':unit.get('locus'),'language':unit['language'],'type':unit['kind'],'start':start_char,'end':end_char})
    texts.append('passage: '+text[start_char:end_char])
    if end==len(offsets):break
 tokenizer.enable_truncation(max_length=384);tokenizer.enable_padding(pad_id=1,pad_token='<pad>')
 torch.set_num_threads(args.threads)
 session=AutoModel.from_pretrained(str(model),local_files_only=True,trust_remote_code=False).eval()
 def embed(batch):
  encoded=tokenizer.encode_batch(batch);ids=torch.tensor([e.ids for e in encoded],dtype=torch.long);mask=torch.tensor([e.attention_mask for e in encoded],dtype=torch.long)
  with torch.inference_mode():
   hidden=session(input_ids=ids,attention_mask=mask).last_hidden_state
   vector=(hidden*mask[...,None]).sum(dim=1)/mask.sum(dim=1).clamp(min=1)[:,None]
   vector=torch.nn.functional.normalize(vector,p=2,dim=1)
  return vector.numpy()
 order=sorted(range(len(rows)),key=lambda i:len(texts[i]));matrix=np.zeros((len(rows),384),dtype=np.int8);start=time.time()
 checkpoint=ROOT.parent/'e5-build-torch-checkpoint.npz';done=set()
 if checkpoint.exists():
  saved=np.load(checkpoint);signature=hashlib.sha256((json.dumps(rows,sort_keys=True)+'offline_pytorch'+hashlib.sha256((model/'model.safetensors').read_bytes()).hexdigest()).encode()).hexdigest()
  if str(saved['signature'])==signature:matrix=saved['matrix'];done=set(saved['done'].tolist());print('Resuming',len(done),'vectors',flush=True)
 signature=hashlib.sha256((json.dumps(rows,sort_keys=True)+'offline_pytorch'+hashlib.sha256((model/'model.safetensors').read_bytes()).hexdigest()).encode()).hexdigest()
 for offset in range(0,len(order),16):
  indices=[i for i in order[offset:offset+16] if i not in done]
  if indices:
   vectors=embed([texts[i] for i in indices]);matrix[indices]=np.clip(np.rint(vectors*127),-127,127).astype(np.int8);done.update(indices)
  if offset%256==0:
   print(json.dumps({'completed':len(done),'total':len(rows),'seconds':round(time.time()-start)}),flush=True)
   temporary=checkpoint.with_suffix('.tmp.npz');np.savez(temporary,matrix=matrix,done=np.array(sorted(done)),signature=signature);temporary.replace(checkpoint)
 name='embeddings-e5-small-int8.bin';(ROOT/'data'/name).write_bytes(matrix.tobytes())
 index={'schema':2,'model':'intfloat/multilingual-e5-small','runtime_model':'Xenova/multilingual-e5-small','runtime_dtype':'q8','build_backend':'offline_pytorch','normalization':'e5-passage-prefix+mean-pooling+l2','dtype':'int8','scale':127,'dimensions':384,'matrix':name,'rows':rows,'corpus_sha256':corpus_hashes,'model_sha256':hashlib.sha256((model/'model.safetensors').read_bytes()).hexdigest(),'scope':'complete_docx_body_tables_and_original_footnotes','max_tokens':384,'version':'2026-10-30.2'}
 (ROOT/'data/embeddings-e5-small-index.json').write_text(json.dumps(index,ensure_ascii=False,separators=(',',':')))
 cases=[('agua potable y búsqueda de manantiales',8),('acústica musical y resonancia del teatro',5),('proporciones del cuerpo humano en los templos',3),('máquinas de guerra y defensa de ciudades',10)]
 queries=embed(['query: '+q for q,_ in cases]);float_matrix=matrix.astype(np.float32);float_matrix/=np.maximum(np.linalg.norm(float_matrix,axis=1,keepdims=True),1e-12)
 checks=[]
 by_id={}
 for edition in corpus_hashes:
  d=json.loads((ROOT/f'data/fulltext/{edition}.json').read_text());by_id[edition]={u['id']:u for u in d['units']}
 for (query,book),vector in zip(cases,queries):
  ranking=np.argsort(float_matrix@vector)[::-1][:20]
  hits=[rows[i] for i in ranking];passed=any(by_id[r['edition']][r['unit_id']].get('book')==book for r in hits)
  checks.append({'query':query,'expected_book_in_top20':book,'passed':passed,'first_hits':hits[:5]})
 (ROOT/'data/semantic-quality-report.json').write_text(json.dumps({'model':index['model'],'rows':len(rows),'scope':index['scope'],'checks':checks,'limitations':'Comprobación temática inicial; no mide exactitud filológica ni garantiza exhaustividad semántica.'},ensure_ascii=False,indent=2))
 print(json.dumps({'vectors':len(rows),'seconds':round(time.time()-start),'checks':[{k:v for k,v in c.items() if k!='first_hits'} for c in checks]}),flush=True)
if __name__=='__main__':main()
