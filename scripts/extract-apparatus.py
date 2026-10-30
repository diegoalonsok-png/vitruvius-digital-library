import re,json,subprocess,sys
pdf,out=sys.argv[1],sys.argv[2]
txt=subprocess.run(['pdftotext',pdf,'-'],capture_output=True,text=True).stdout
pages=txt.split('\f')
LAB=r'(APARATO CR[ÍI]TICO(?: COMPARATIVO)?|NOTA ECD[ÓO]TICA|Nota ecd[óo]tica|Nota cr[íi]tica)'
start=re.compile(r'^(?:\d{1,3}\s+)?'+LAB)
endp=re.compile(r'^(?:\d{1,3}\s+\S.*\]|\d{1,3}\s+[A-ZÁÉÍÓÚ]{3,}|NOTA [A-ZÁÉÍÓÚ]|Nota [a-záéíóú]+\b|S[ÍI]NTESIS|[A-ZÁÉÍÓÚ ]{12,}$)')
R={'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,'VIII':8,'IX':9,'X':10}
notes=[]
for pi,pg in enumerate(pages,1):
    L=[l.strip() for l in pg.splitlines()]
    i=0
    while i<len(L):
        if start.match(L[i]):
            buf=[re.sub(r'^\d{1,3}\s+','',L[i])]; j=i+1
            while j<len(L) and L[j] and not start.match(L[j]) and not endp.match(L[j]) and not re.fullmatch(r'\d{1,4}|.*el arquitecto de la teor[íi]a.*',L[j],re.I):
                buf.append(L[j]); j+=1
            t=re.sub(r'-\s+(?=[a-záéíóú])','',' '.join(buf)); t=re.sub(r'\s+',' ',t).strip()
            loci=set()
            for m in re.finditer(r'\b(X|IX|VIII|VII|VI|V|IV|III|II|I)[. ]\s?(praef|\d+)\.?\s?(\d+)(?:\s?[–-]\s?(\d+))?',t[:320]):
                b=R[m.group(1)];c=m.group(2).rstrip('.');a=int(m.group(3));z=int(m.group(4) or a)
                for s in range(a,min(z,a+30)+1): loci.add(f'{b}.{c}.{s}')
            if loci and len(t)>60: notes.append({'loci':sorted(loci),'label':re.match(LAB,t).group(1).upper().replace('Ó','Ó'),'text':t,'pdf_page':pi})
            i=j
        else: i+=1
json.dump({'edition':'V514','source':'Diego Kurilo, Vitruvio. De architectura, V514 (2026), notas rotuladas de nivel [F]','notes':notes},open(out,'w'),ensure_ascii=False,indent=1)
print(len(notes), sum(len(n['loci']) for n in notes))
