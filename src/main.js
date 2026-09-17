import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as mupdf from 'mupdf';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const app=document.querySelector('#app');
app.innerHTML=`<header><b>PDF Editor V6.2</b><span class="sub">Direct text removal • preserved boxes/background • signature library</span><label class="open">Open PDF<input id="pdfInput" type="file" accept="application/pdf" hidden></label><button id="save" disabled>Save PDF</button></header>
<div class="shell"><aside>
<button data-tool="edit" class="active">↖ Edit existing</button><button data-tool="text">T Add text</button><button data-tool="whiteout">▭ Whiteout</button><button data-tool="rect">□ Box</button><button data-tool="check">✓ Check / X</button>
<button id="addImage">▧ Signature / image</button><input id="imageInput" type="file" accept="image/png,image/jpeg" hidden>
<hr><b>Editing</b><label class="switch"><input id="existingText" type="checkbox" checked> Existing text clickable</label><label class="switch"><input id="nativeFields" type="checkbox" checked> Native form fields</label><div id="info" class="mini">Open a PDF.</div>
<hr><b>Signature presets</b><div id="presets"></div><button id="savePreset">+ Save signature preset</button>
<hr><button id="delete">Delete selected</button><button id="undo">Undo last</button>
<div class="help"><b>Edit existing text:</b> choose Edit existing, then click the words. An input appears over that exact area. Type and press Enter.<br><br><b>Real PDF fields:</b> text boxes, checkboxes, radio buttons and dropdowns are interactive directly.<br><br><b>Printed empty boxes:</b> use Add text or Check / X and click inside the box.</div>
</aside><main><div id="empty"><h2>Open a PDF</h2><p>Edit fields directly, click printed text to replace it, or add signatures and annotations.</p></div><div id="stageWrap" hidden><div id="stage"><canvas id="pdfCanvas"></canvas><div id="interaction"></div><div id="overlay"></div></div></div></main></div>
<footer><button id="prev">←</button><span id="pageInfo">No PDF</span><button id="next">→</button><button id="zoomOut">−</button><span id="zoomLabel">100%</span><button id="zoomIn">+</button></footer>`;
const $=s=>document.querySelector(s);let pdf=null,pdfBytes=null,pageNum=1,zoom=1.15,objects=[],selected=null,tool='edit',pageData=new Map(),formEdits=new Map(),token=0;
const stage=$('#stage'),canvas=$('#pdfCanvas'),interaction=$('#interaction'),overlay=$('#overlay');
const esc=s=>(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const pageObjects=()=>objects.filter(o=>o.page===pageNum);
function select(el){document.querySelectorAll('.obj.selected').forEach(x=>x.classList.remove('selected'));selected=el;if(el)el.classList.add('selected')}
async function inspectPage(page,vp){const tc=await page.getTextContent(),anns=await page.getAnnotations({intent:'display'});const pieces=[];for(const item of tc.items){if(!item.str?.trim())continue;const tx=pdfjsLib.Util.transform(vp.transform,item.transform),fontPx=Math.max(7,Math.hypot(tx[2],tx[3]));pieces.push({str:item.str,x:tx[4],y:tx[5]-fontPx,w:Math.max(3,item.width*zoom),h:fontPx*1.12,fontSize:fontPx/zoom});}
// Merge adjacent PDF text pieces on the same baseline so clicks feel like Acrobat lines/fields.
pieces.sort((a,b)=>Math.abs(a.y-b.y)<3?a.x-b.x:a.y-b.y);const lines=[];for(const p of pieces){let last=lines.at(-1);if(last&&Math.abs(last.y-p.y)<Math.max(3,p.h*.25)&&p.x-(last.x+last.w)<Math.max(14,p.h*1.2)){last.str+=(p.x-(last.x+last.w)>2?' ':'')+p.str;last.w=Math.max(last.w,p.x+p.w-last.x);last.h=Math.max(last.h,p.h);last.fontSize=Math.max(last.fontSize,p.fontSize)}else lines.push({...p});}
const fields=anns.filter(a=>a.subtype==='Widget').map(a=>{const r=vp.convertToViewportRectangle(a.rect);return{id:a.id,name:a.fieldName||'',type:a.fieldType||'',value:a.fieldValue??'',options:a.options||[],checkBox:!!a.checkBox,radioButton:!!a.radioButton,buttonValue:a.buttonValue||a.exportValue||'',x:Math.min(r[0],r[2]),y:Math.min(r[1],r[3]),w:Math.abs(r[2]-r[0]),h:Math.abs(r[3]-r[1])}});pageData.set(pageNum,{lines,fields});}
async function render(){if(!pdf)return;const t=++token,page=await pdf.getPage(pageNum),vp=page.getViewport({scale:zoom});if(t!==token)return;canvas.width=vp.width;canvas.height=vp.height;for(const e of [canvas,interaction,overlay,stage]){e.style.width=vp.width+'px';e.style.height=vp.height+'px'}await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;await inspectPage(page,vp);drawInteraction();drawObjects();$('#pageInfo').textContent=`Page ${pageNum} / ${pdf.numPages}`;$('#zoomLabel').textContent=Math.round(zoom/1.15*100)+'%'}
function drawInteraction(){interaction.innerHTML='';const d=pageData.get(pageNum)||{lines:[],fields:[]};$('#info').textContent=`${d.lines.length} editable text areas • ${d.fields.length} native fields`;
if($('#existingText').checked)d.lines.forEach((x,i)=>{const hit=document.createElement('button');hit.className='textHit';hit.title='Click to edit: '+x.str;Object.assign(hit.style,{left:x.x+'px',top:x.y+'px',width:Math.max(8,x.w)+'px',height:Math.max(10,x.h)+'px'});hit.onclick=e=>{e.stopPropagation();if(tool==='edit')editLine(x,i)};interaction.appendChild(hit)});
if($('#nativeFields').checked)d.fields.forEach(drawField)}
function editLine(x,i){let o=objects.find(o=>o.type==='replaceText'&&o.page===pageNum&&o.sourceIndex===i);if(!o)o=addObj('replaceText',x.x/zoom,x.y/zoom,{w:Math.max(45,x.w/zoom),h:Math.max(15,x.h/zoom),sourceW:Math.max(45,x.w/zoom),sourceH:Math.max(15,x.h/zoom),fontSize:Math.max(7,x.fontSize),text:x.str,sourceIndex:i});const el=overlay.querySelector(`[data-id="${o.id}"]`);select(el);const input=el?.querySelector('textarea');if(input){input.focus();input.select()}}
const fkey=f=>`${pageNum}:${f.name||f.id}`;
function drawField(f){const key=fkey(f),current=formEdits.has(key)?formEdits.get(key):f.value;let el;if(f.type==='Btn'&&f.radioButton){el=document.createElement('input');el.type='radio';el.className='nativeField radio';el.name='radio_'+(f.name||f.id);el.checked=String(current)===String(f.buttonValue)||current===true;el.onchange=()=>{if(el.checked)formEdits.set(key,f.buttonValue||'Yes')}}else if(f.type==='Btn'){el=document.createElement('input');el.type='checkbox';el.className='nativeField checkbox';el.checked=!!current&&current!=='Off';el.onchange=()=>formEdits.set(key,el.checked)}else if(f.type==='Ch'&&f.options?.length){el=document.createElement('select');el.className='nativeField';for(const op of f.options){const opt=document.createElement('option');opt.value=op.exportValue??op.displayValue??op;opt.textContent=op.displayValue??op.exportValue??op;el.appendChild(opt)}el.value=current||'';el.onchange=()=>formEdits.set(key,el.value)}else{el=document.createElement('input');el.type='text';el.className='nativeField';el.value=current||'';el.oninput=()=>formEdits.set(key,el.value)}el.title=f.name||'PDF field';Object.assign(el.style,{left:f.x+'px',top:f.y+'px',width:Math.max(12,f.w)+'px',height:Math.max(12,f.h)+'px'});interaction.appendChild(el)}
function addObj(type,x=60,y=60,extra={}){const o={id:crypto.randomUUID(),page:pageNum,type,x,y,w:(type==='text'||type==='replaceText')?170:type==='image'?140:36,h:(type==='text'||type==='replaceText')?28:type==='image'?60:30,fontSize:16,...extra};objects.push(o);const el=createObj(o);select(el);return o}
function drawObjects(){overlay.innerHTML='';selected=null;pageObjects().forEach(createObj)}
function createObj(o){const el=document.createElement('div');el.className='obj '+o.type;el.dataset.id=o.id;Object.assign(el.style,{left:o.x*zoom+'px',top:o.y*zoom+'px',width:o.w*zoom+'px',height:o.h*zoom+'px'});if(o.type==='text'||o.type==='replaceText'){el.innerHTML=`<textarea class="inlineText" rows="1" spellcheck="false">${esc(o.text)}</textarea><i class="handle"></i>`;el.style.fontSize=o.fontSize*zoom+'px'}else if(o.type==='whiteout'||o.type==='rect')el.innerHTML='<i class="handle"></i>';else if(o.type==='check'){el.innerHTML='<span>✓</span><i class="handle"></i>';el.style.fontSize=o.fontSize*zoom+'px'}else if(o.type==='image')el.innerHTML=`<img src="${o.src}"><i class="handle"></i>`;overlay.appendChild(el);wire(el,o);return el}
function wire(el,o){const input=el.querySelector('.inlineText');if(input){
  const autoGrow=()=>{o.text=input.value;const probe=document.createElement('span');probe.className='textProbe';probe.style.fontSize=(o.fontSize*zoom)+'px';probe.textContent=input.value||' ';document.body.appendChild(probe);const minW=(o.sourceW||45)*zoom;const wanted=Math.max(minW,probe.getBoundingClientRect().width+12);probe.remove();const lines=Math.max(1,(input.value.match(/\n/g)||[]).length+1);const wantedH=Math.max((o.sourceH||15)*zoom,lines*o.fontSize*zoom*1.25+6);o.w=wanted/zoom;o.h=wantedH/zoom;el.style.width=wanted+'px';el.style.height=wantedH+'px';input.style.width='100%';input.style.height='100%'};
  input.oninput=autoGrow;input.onfocus=()=>{select(el);el.classList.add('typing')};input.onblur=()=>el.classList.remove('typing');input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();input.blur()}};setTimeout(autoGrow,0)
}
el.addEventListener('pointerdown',e=>{if(e.target.matches('input,.handle'))return;select(el);let sx=e.clientX,sy=e.clientY,ox=o.x,oy=o.y;el.setPointerCapture(e.pointerId);const mv=v=>{o.x=ox+(v.clientX-sx)/zoom;o.y=oy+(v.clientY-sy)/zoom;el.style.left=o.x*zoom+'px';el.style.top=o.y*zoom+'px'},up=()=>{el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up)};el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up)});const h=el.querySelector('.handle');h?.addEventListener('pointerdown',e=>{e.stopPropagation();select(el);let sx=e.clientX,sy=e.clientY,ow=o.w,oh=o.h;h.setPointerCapture(e.pointerId);const mv=v=>{o.w=Math.max(12,ow+(v.clientX-sx)/zoom);o.h=o.type==='image'&&o.aspect?o.w/o.aspect:Math.max(12,oh+(v.clientY-sy)/zoom);el.style.width=o.w*zoom+'px';el.style.height=o.h*zoom+'px'},up=()=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up)};h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up)})}
overlay.addEventListener('pointerdown',e=>{if(e.target!==overlay)return;select(null);const r=overlay.getBoundingClientRect(),x=(e.clientX-r.left)/zoom,y=(e.clientY-r.top)/zoom;if(tool==='text'){const o=addObj('text',x,y,{text:''});setTimeout(()=>overlay.querySelector(`[data-id="${o.id}"] textarea`)?.focus())}else if(tool==='whiteout')addObj('whiteout',x,y,{w:150,h:26});else if(tool==='rect')addObj('rect',x,y,{w:150,h:38});else if(tool==='check')addObj('check',x,y,{w:26,h:26,fontSize:22})});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));overlay.style.pointerEvents=tool==='edit'?'none':'auto';interaction.classList.toggle('editing',tool==='edit')});overlay.style.pointerEvents='none';interaction.classList.add('editing');
$('#existingText').onchange=drawInteraction;$('#nativeFields').onchange=drawInteraction;
$('#pdfInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;pdfBytes=new Uint8Array(await f.arrayBuffer());pdf=await pdfjsLib.getDocument({data:pdfBytes.slice()}).promise;pageNum=1;objects=[];formEdits.clear();pageData.clear();$('#empty').hidden=true;$('#stageWrap').hidden=false;$('#save').disabled=false;render()};
$('#prev').onclick=()=>{if(pdf&&pageNum>1){pageNum--;render()}};$('#next').onclick=()=>{if(pdf&&pageNum<pdf.numPages){pageNum++;render()}};$('#zoomIn').onclick=()=>{if(pdf){zoom=Math.min(2.5,zoom+.15);render()}};$('#zoomOut').onclick=()=>{if(pdf){zoom=Math.max(.5,zoom-.15);render()}};$('#delete').onclick=()=>{if(!selected)return;objects=objects.filter(o=>o.id!==selected.dataset.id);selected.remove();selected=null};$('#undo').onclick=()=>{if(objects.length){objects.pop();drawObjects()}};
const dataURL=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});async function addImageFile(file){const src=await dataURL(file),img=new Image();img.onload=()=>{let w=150,h=w*img.height/img.width;if(h>110){h=110;w=h*img.width/img.height}addObj('image',60,60,{src,w,h,aspect:img.width/img.height})};img.src=src}$('#addImage').onclick=()=>$('#imageInput').click();$('#imageInput').onchange=e=>{if(e.target.files[0])addImageFile(e.target.files[0]);e.target.value=''};
const SIG_DB='pdf-editor-signatures-v1',SIG_STORE='signatures';
function sigDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(SIG_DB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(SIG_STORE))db.createObjectStore(SIG_STORE,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function sigAll(){const db=await sigDB();return new Promise((resolve,reject)=>{const r=db.transaction(SIG_STORE,'readonly').objectStore(SIG_STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
async function sigPut(x){const db=await sigDB();return new Promise((resolve,reject)=>{const r=db.transaction(SIG_STORE,'readwrite').objectStore(SIG_STORE).put(x);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
async function sigDelete(id){const db=await sigDB();return new Promise((resolve,reject)=>{const r=db.transaction(SIG_STORE,'readwrite').objectStore(SIG_STORE).delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
async function showPresets(){const p=await sigAll();$('#presets').innerHTML=p.length?p.map(x=>`<div class="preset"><button data-p="${x.id}">${esc(x.name)}</button><button data-r="${x.id}" title="Rename">✎</button><button data-d="${x.id}" title="Delete">×</button></div>`).join(''):'<small>No saved presets</small>';document.querySelectorAll('[data-p]').forEach(b=>b.onclick=async()=>{const x=(await sigAll()).find(v=>v.id===b.dataset.p);if(!x)return;const img=new Image();img.onload=()=>{let w=150,h=w*img.height/img.width;if(h>110){h=110;w=h*img.width/img.height}addObj('image',60,60,{src:x.src,w,h,aspect:img.width/img.height})};img.src=x.src});document.querySelectorAll('[data-r]').forEach(b=>b.onclick=async()=>{const x=(await sigAll()).find(v=>v.id===b.dataset.r);if(!x)return;const name=prompt('Signature name:',x.name);if(name?.trim()){x.name=name.trim();await sigPut(x);showPresets()}});document.querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this saved signature?')){await sigDelete(b.dataset.d);showPresets()}})}
$('#savePreset').onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='image/png,image/jpeg';i.onchange=async()=>{if(!i.files[0])return;const name=prompt('Signature name:',i.files[0].name.replace(/\.[^.]+$/,''));if(!name?.trim())return;const src=await dataURL(i.files[0]);await sigPut({id:crypto.randomUUID(),name:name.trim(),src,createdAt:Date.now()});await showPresets()};i.click()};showPresets();
async function applyFields(doc){let form;try{form=doc.getForm()}catch{return}for(const [key,val] of formEdits){const name=key.slice(key.indexOf(':')+1);let f;try{f=form.getField(name)}catch{continue}try{const n=f.constructor.name;if(n.includes('CheckBox'))val?f.check():f.uncheck();else if(n.includes('RadioGroup'))f.select(String(val));else if(n.includes('Dropdown')||n.includes('OptionList'))f.select(String(val));else if(n.includes('TextField'))f.setText(String(val))}catch(e){console.warn(name,e)}}try{form.updateFieldAppearances(await doc.embedFont(StandardFonts.Helvetica))}catch{}}
async function removeOriginalTextContent(inputBytes){
  // MuPDF redaction can remove ONLY text while explicitly preserving images and line art.
  // This is the key difference from V5: no white rectangle is painted over the field.
  const replacements=objects.filter(o=>o.type==='replaceText');
  if(!replacements.length)return inputBytes.slice();
  let mdoc;
  try{
    mdoc=mupdf.Document.openDocument(inputBytes.slice(), 'application/pdf');
    const pdfDoc=mdoc.asPDF();
    const byPage=new Map();
    for(const o of replacements){if(!byPage.has(o.page))byPage.set(o.page,[]);byPage.get(o.page).push(o)}
    for(const [pageNo,items] of byPage){
      const page=pdfDoc.loadPage(pageNo-1);
      for(const o of items){
        // Tight rectangle around the original detected text only. MuPDF coordinates use
        // a top-left origin, matching the editor coordinates.
        const padX=Math.min(0.8, Math.max(0.15,(o.fontSize||10)*0.035));
        const padY=Math.min(0.5, Math.max(0.10,(o.fontSize||10)*0.025));
        const x0=Math.max(0,o.x-padX), y0=Math.max(0,o.y-padY);
        const x1=o.x+(o.sourceW||o.w)+padX, y1=o.y+(o.sourceH||o.h)+padY;
        const red=page.createAnnotation('Redact');
        red.setRect([x0,y0,x1,y1]);
        red.update();
      }
      // Preserve images and line art (box borders, grey fills, blue rules); remove text only.
      page.applyRedactions(
        false,
        mupdf.PDFPage.REDACT_IMAGE_NONE,
        mupdf.PDFPage.REDACT_LINE_ART_NONE,
        mupdf.PDFPage.REDACT_TEXT_REMOVE
      );
      page.destroy();
    }
    const out=pdfDoc.saveToBuffer('garbage,compress').asUint8Array();
    return new Uint8Array(out);
  }catch(err){
    console.error('Direct text removal failed',err);
    throw new Error('This PDF could not be edited at content level. No file was changed. '+(err?.message||err));
  }finally{try{mdoc?.destroy()}catch{}}
}
$('#save').onclick=async()=>{if(!pdfBytes)return;let cleaned;try{cleaned=await removeOriginalTextContent(pdfBytes)}catch(err){alert(err.message);return}const doc=await PDFDocument.load(cleaned),font=await doc.embedFont(StandardFonts.Helvetica);await applyFields(doc);for(const o of objects){const p=doc.getPage(o.page-1),H=p.getHeight();if(o.type==='whiteout')p.drawRectangle({x:o.x,y:H-o.y-o.h,width:o.w,height:o.h,color:rgb(1,1,1)});if(o.type==='rect')p.drawRectangle({x:o.x,y:H-o.y-o.h,width:o.w,height:o.h,borderColor:rgb(0,0,0),borderWidth:1});if(o.type==='text'||o.type==='replaceText')p.drawText(o.text||'',{x:o.x,y:H-o.y-o.fontSize,size:o.fontSize,font,color:rgb(0,0,0),maxWidth:o.w,lineHeight:o.fontSize*1.1});if(o.type==='check'){
  // Draw a true checkmark as vector strokes. Do not use a Unicode glyph:
  // PDF standard fonts can substitute unsupported glyphs during export.
  const left=o.x, bottom=H-o.y-o.h, w=o.w, h=o.h;
  const thickness=Math.max(1,Math.min(w,h)*0.085);
  p.drawLine({start:{x:left+w*0.16,y:bottom+h*0.48},end:{x:left+w*0.39,y:bottom+h*0.24},thickness,color:rgb(0,0,0)});
  p.drawLine({start:{x:left+w*0.39,y:bottom+h*0.24},end:{x:left+w*0.86,y:bottom+h*0.80},thickness,color:rgb(0,0,0)});
}if(o.type==='image'){const bytes=await fetch(o.src).then(r=>r.arrayBuffer());let im;try{im=await doc.embedPng(bytes)}catch{im=await doc.embedJpg(bytes)}p.drawImage(im,{x:o.x,y:H-o.y-o.h,width:o.w,height:o.h})}}const out=await doc.save(),blob=new Blob([out],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='edited.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
window.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&selected&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();$('#delete').click()}});
