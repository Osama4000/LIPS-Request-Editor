import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const app=document.querySelector('#app');
app.innerHTML=`
<header><b>PDF Editor</b><span class="sub">Browser-only • files stay on this device</span><label class="open">Open PDF<input id="pdfInput" type="file" accept="application/pdf" hidden></label><button id="save" disabled>Save PDF</button></header>
<div class="shell"><aside>
  <button data-tool="select" class="active">↖ Select / move</button>
  <button data-tool="text">T Add text</button>
  <button data-tool="whiteout">▭ Whiteout</button>
  <button data-tool="check">✓ Checkmark</button>
  <button id="addImage">▧ Add image/signature</button><input id="imageInput" type="file" accept="image/png,image/jpeg" hidden>
  <hr><b>Signature presets</b><div id="presets"></div><button id="savePreset">+ Save image as preset</button>
  <hr><button id="delete">Delete selected</button><button id="undo">Undo last</button>
  <div class="help">Tip: use Whiteout over old text, then Add text. Images and text can be dragged and resized.</div>
</aside><main>
  <div id="empty"><h2>Open any PDF</h2><p>Edit it visually, add text/checkmarks/signatures, then save a new PDF.</p></div>
  <div id="stageWrap" hidden><div id="stage"><canvas id="pdfCanvas"></canvas><div id="overlay"></div></div></div>
</main></div>
<footer><button id="prev">←</button><span id="pageInfo">No PDF</span><button id="next">→</button><button id="zoomOut">−</button><span id="zoomLabel">100%</span><button id="zoomIn">+</button></footer>`;

const $=s=>document.querySelector(s); let pdf=null, pdfBytes=null, pageNum=1, zoom=1.15, objects=[], selected=null, tool='select', renderToken=0;
const stage=$('#stage'), overlay=$('#overlay'), canvas=$('#pdfCanvas');
function pageObjects(){return objects.filter(o=>o.page===pageNum)}
function setSelected(el){document.querySelectorAll('.obj.selected').forEach(x=>x.classList.remove('selected'));selected=el;if(el)el.classList.add('selected')}
function esc(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function render(){if(!pdf)return; const token=++renderToken; const page=await pdf.getPage(pageNum);const vp=page.getViewport({scale:zoom});if(token!==renderToken)return; canvas.width=vp.width;canvas.height=vp.height;canvas.style.width=vp.width+'px';canvas.style.height=vp.height+'px';overlay.style.width=vp.width+'px';overlay.style.height=vp.height+'px';stage.style.width=vp.width+'px';stage.style.height=vp.height+'px';await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise; drawObjects();$('#pageInfo').textContent=`Page ${pageNum} / ${pdf.numPages}`;$('#zoomLabel').textContent=Math.round(zoom/1.15*100)+'%'}
function drawObjects(){overlay.innerHTML='';selected=null;for(const o of pageObjects()) createEl(o)}
function createEl(o){const el=document.createElement('div');el.className='obj '+o.type;el.dataset.id=o.id;el.style.left=o.x*zoom+'px';el.style.top=o.y*zoom+'px';el.style.width=o.w*zoom+'px';el.style.height=o.h*zoom+'px';
 if(o.type==='text'){el.innerHTML=`<div class="textbody" contenteditable="true">${esc(o.text)}</div><i class="handle"></i>`;el.style.fontSize=o.fontSize*zoom+'px'}
 if(o.type==='whiteout')el.innerHTML='<i class="handle"></i>';
 if(o.type==='check'){el.innerHTML='<span>✓</span><i class="handle"></i>';el.style.fontSize=o.fontSize*zoom+'px'}
 if(o.type==='image'){el.innerHTML=`<img src="${o.src}"><i class="handle"></i>`}
 overlay.appendChild(el); wire(el,o);return el}
function wire(el,o){el.addEventListener('pointerdown',e=>{if(e.target.classList.contains('textbody')){setSelected(el);return} if(e.target.classList.contains('handle'))return;setSelected(el);let sx=e.clientX,sy=e.clientY,ox=o.x,oy=o.y;el.setPointerCapture(e.pointerId);const move=ev=>{o.x=ox+(ev.clientX-sx)/zoom;o.y=oy+(ev.clientY-sy)/zoom;el.style.left=o.x*zoom+'px';el.style.top=o.y*zoom+'px'};const up=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up)};el.addEventListener('pointermove',move);el.addEventListener('pointerup',up)});
 const h=el.querySelector('.handle');h?.addEventListener('pointerdown',e=>{e.stopPropagation();setSelected(el);let sx=e.clientX,sy=e.clientY,ow=o.w,oh=o.h;h.setPointerCapture(e.pointerId);const move=ev=>{o.w=Math.max(12,ow+(ev.clientX-sx)/zoom);o.h=Math.max(12,oh+(ev.clientY-sy)/zoom);el.style.width=o.w*zoom+'px';el.style.height=o.h*zoom+'px'};const up=()=>{h.removeEventListener('pointermove',move);h.removeEventListener('pointerup',up)};h.addEventListener('pointermove',move);h.addEventListener('pointerup',up)});
 const tb=el.querySelector('.textbody');tb?.addEventListener('input',()=>o.text=tb.innerText)}
function addObj(type,x=60,y=60,extra={}){const base={id:crypto.randomUUID(),page:pageNum,type,x,y,w: type==='text'?180: type==='image'?130:40,h:type==='text'?34:type==='image'?55:32,fontSize:18,...extra};objects.push(base);const el=createEl(base);setSelected(el);return base}
overlay.addEventListener('pointerdown',e=>{if(e.target!==overlay)return;setSelected(null);const r=overlay.getBoundingClientRect(),x=(e.clientX-r.left)/zoom,y=(e.clientY-r.top)/zoom;if(tool==='text')addObj('text',x,y,{text:'Type here'});if(tool==='whiteout')addObj('whiteout',x,y,{w:160,h:28});if(tool==='check')addObj('check',x,y,{w:30,h:30,fontSize:24})});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b))});
$('#pdfInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;pdfBytes=new Uint8Array(await f.arrayBuffer());pdf=await pdfjsLib.getDocument({data:pdfBytes.slice()}).promise;pageNum=1;objects=[];$('#empty').hidden=true;$('#stageWrap').hidden=false;$('#save').disabled=false;render()};
$('#prev').onclick=()=>{if(pdf&&pageNum>1){pageNum--;render()}};$('#next').onclick=()=>{if(pdf&&pageNum<pdf.numPages){pageNum++;render()}};$('#zoomIn').onclick=()=>{if(pdf){zoom=Math.min(2.5,zoom+.15);render()}};$('#zoomOut').onclick=()=>{if(pdf){zoom=Math.max(.5,zoom-.15);render()}};
$('#delete').onclick=()=>{if(!selected)return;const id=selected.dataset.id;objects=objects.filter(o=>o.id!==id);selected.remove();selected=null};$('#undo').onclick=()=>{if(objects.length){objects.pop();drawObjects()}};
function dataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
async function addImageFile(file){const src=await dataURL(file);const img=new Image();img.onload=()=>{let w=150,h=w*img.height/img.width;if(h>100){h=100;w=h*img.width/img.height}addObj('image',60,60,{src,w,h})};img.src=src}
$('#addImage').onclick=()=>$('#imageInput').click();$('#imageInput').onchange=e=>{if(e.target.files[0])addImageFile(e.target.files[0]);e.target.value=''};
function getPresets(){try{return JSON.parse(localStorage.getItem('pdf-sign-presets')||'[]')}catch{return[]}}
function showPresets(){const p=getPresets();$('#presets').innerHTML=p.length?p.map((x,i)=>`<div class="preset"><button data-p="${i}">${esc(x.name)}</button><button data-d="${i}">×</button></div>`).join(''):'<small>No saved presets</small>';document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const x=getPresets()[+b.dataset.p];const img=new Image();img.onload=()=>{let w=150,h=w*img.height/img.width;addObj('image',60,60,{src:x.src,w,h})};img.src=x.src});document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{let a=getPresets();a.splice(+b.dataset.d,1);localStorage.setItem('pdf-sign-presets',JSON.stringify(a));showPresets()})}
$('#savePreset').onclick=()=>{const inp=document.createElement('input');inp.type='file';inp.accept='image/png,image/jpeg';inp.onchange=async()=>{if(!inp.files[0])return;const name=prompt('Preset name:',inp.files[0].name.replace(/\.[^.]+$/,''));if(!name)return;const a=getPresets();a.push({name,src:await dataURL(inp.files[0])});localStorage.setItem('pdf-sign-presets',JSON.stringify(a));showPresets()};inp.click()};showPresets();
$('#save').onclick=async()=>{if(!pdfBytes)return;const doc=await PDFDocument.load(pdfBytes);const font=await doc.embedFont(StandardFonts.Helvetica);for(const o of objects){const p=doc.getPage(o.page-1),H=p.getHeight();if(o.type==='whiteout')p.drawRectangle({x:o.x,y:H-o.y-o.h,width:o.w,height:o.h,color:rgb(1,1,1)});if(o.type==='text')p.drawText(o.text||'',{x:o.x,y:H-o.y-o.fontSize,width:o.w,size:o.fontSize,font,color:rgb(0,0,0),lineHeight:o.fontSize*1.15,maxWidth:o.w});if(o.type==='check')p.drawText('X',{x:o.x+4,y:H-o.y-o.fontSize,size:o.fontSize,font,color:rgb(0,0,0)});if(o.type==='image'){const bytes=await fetch(o.src).then(r=>r.arrayBuffer());let im;try{im=await doc.embedPng(bytes)}catch{im=await doc.embedJpg(bytes)}p.drawImage(im,{x:o.x,y:H-o.y-o.h,width:o.w,height:o.h})}}
 const out=await doc.save();const blob=new Blob([out],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='edited.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
window.addEventListener('keydown',e=>{if((e.key==='Delete'||e.key==='Backspace')&&selected&&!e.target.isContentEditable){e.preventDefault();$('#delete').click()}});
