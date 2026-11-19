const $ = (id) => document.getElementById(id);
const dropZone = $('dropZone');
const fileInput = $('fileInput');
const browseButton = $('browseButton');
const progressPanel = $('progressPanel');
const progressBar = $('progressBar');
const progressLabel = $('progressLabel');
const progressPercent = $('progressPercent');
const fileStatus = $('fileStatus');
const reviewPanel = $('reviewPanel');
const reviewTitle = $('reviewTitle');
const reviewSummary = $('reviewSummary');
const moduleTabs = $('moduleTabs');
const tableWrap = $('tableWrap');
const errorPanel = $('errorPanel');
const downloadButton = $('downloadButton');
const resetButton = $('resetButton');

let modules = [];
let activeModule = 0;

const SECTION_DEFS = [
  { key:'general', title:'General', rows:[
    ['manufacturerSeries','Manufacturer / Series',''],['model','Model',''],['technology','Technology','']
  ]},
  { key:'stc', title:'Electrical Data – STC', rows:[
    ['pmax','Peak power (Pmax)','Wp'],['powerSelection','Power selection','W'],['vmpp','Max. power voltage (Vmpp)','V'],['impp','Max. power current (Impp)','A'],['voc','Open-circuit voltage (Voc)','V'],['isc','Short-circuit current (Isc)','A'],['efficiency','Module efficiency','%']
  ]},
  { key:'noct', title:'Electrical Data – NOCT', rows:[
    ['noctPmax','Peak power (Pmax)','Wp'],['noctVmpp','Max. power voltage (Vmpp)','V'],['noctImpp','Max. power current (Impp)','A'],['noctVoc','Open-circuit voltage (Voc)','V'],['noctIsc','Short-circuit current (Isc)','A']
  ]},
  { key:'temperature', title:'Temperature & Application', rows:[
    ['noct','NOCT','°C'],['tempPmax','Temp. coeff. of Pmax','%/°C'],['tempVoc','Temp. coeff. of Voc','%/°C'],['tempIsc','Temp. coeff. of Isc','%/°C'],['operatingTemp','Operating temperature','°C'],['maxVoltage','Max. system voltage','V DC'],['fuse','Max. series fuse rating','A']
  ]},
  { key:'mechanical', title:'Mechanical Data', rows:[
    ['cells','No. of cells','cells'],['dimensions','Dimensions (L×W×H)','mm'],['weight','Weight','kg'],['frontGlass','Front glass',''],['backGlass','Back glass',''],['frame','Frame',''],['junctionBox','Junction box',''],['cable','Cable',''],['connector','Connector',''],['testLoad','Test load (front / back)','Pa'],['packaging','Packaging','']
  ]},
  { key:'warranty', title:'Warranty', rows:[
    ['productWarranty','Product warranty','years'],['powerGuarantee','Power guarantee','years'],['degradation','1st-year degradation','%']
  ]}
];

function blankModule(power) {
  const data = {};
  SECTION_DEFS.forEach(section => section.rows.forEach(([key]) => data[key] = {value:'', found:false}));
  data.pmax.value = String(power); data.pmax.found = true;
  return { power, data, source:'Detected from PDF' };
}

function clean(value){ return String(value ?? '').replace(/\s+/g,' ').trim(); }
function norm(value){ return clean(value).toLowerCase().replace(/[–—−]/g,'-').replace(/[^a-z0-9%/+.-]+/g,' '); }
function setValue(mod, key, value, found=true){ const v=clean(value); if(v){ mod.data[key]={value:v,found}; } }
function fieldKey(label, section){
  const l=norm(label);
  if(/peak power|maximum power.*pmax|power watts/.test(l)) return section==='noct'?'noctPmax':'pmax';
  if(/power selection/.test(l)) return 'powerSelection';
  if(/maximum power voltage|vmpp/.test(l)) return section==='noct'?'noctVmpp':'vmpp';
  if(/maximum power current|impp/.test(l)) return section==='noct'?'noctImpp':'impp';
  if(/open circuit voltage|open-circuit voltage|voc/.test(l)) return section==='noct'?'noctVoc':'voc';
  if(/short circuit current|short-circuit current|isc/.test(l)) return section==='noct'?'noctIsc':'isc';
  if(/module efficiency|efficiency/.test(l)) return 'efficiency';
  if(/^noct|nominal operating cell temperature/.test(l)) return 'noct';
  if(/temperature coefficient.*pmax|temp.*coeff.*pmax/.test(l)) return 'tempPmax';
  if(/temperature coefficient.*voc|temp.*coeff.*voc/.test(l)) return 'tempVoc';
  if(/temperature coefficient.*isc|temp.*coeff.*isc/.test(l)) return 'tempIsc';
  if(/operating temperature/.test(l)) return 'operatingTemp';
  if(/max(imum)? system voltage/.test(l)) return 'maxVoltage';
  if(/max(imum)? series fuse/.test(l)) return 'fuse';
  if(/solar cells|no. of cells|number of cells/.test(l)) return 'cells';
  if(/^dimensions|module dimensions/.test(l)) return 'dimensions';
  if(/^weight/.test(l)) return 'weight';
  if(/front glass/.test(l)) return 'frontGlass';
  if(/back glass/.test(l)) return 'backGlass';
  if(/^frame/.test(l)) return 'frame';
  if(/junction box|j-box/.test(l)) return 'junctionBox';
  if(/^cables?|^cable/.test(l)) return 'cable';
  if(/^connector/.test(l)) return 'connector';
  if(/test load/.test(l)) return 'testLoad';
  if(/packaging|package/.test(l)) return 'packaging';
  if(/product warranty/.test(l)) return 'productWarranty';
  if(/power guarantee/.test(l)) return 'powerGuarantee';
  if(/degradation|attenuation/.test(l)) return 'degradation';
  return null;
}

async function loadPdfjs(){
  if(window.pdfjsLib){
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
    return window.pdfjsLib;
  }
  const lib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
  window.pdfjsLib=lib; return lib;
}
function itemRows(items){
  const rows=[];
  items.forEach(item=>{
    const text=clean(item.str); if(!text) return;
    const x=item.transform[4], y=item.transform[5];
    let row=rows.find(r=>Math.abs(r.y-y)<3.2);
    if(!row){row={y,items:[]};rows.push(row)}
    row.items.push({x,y,text,w:item.width||0});
  });
  return rows.sort((a,b)=>b.y-a.y).map(r=>({...r,items:r.items.sort((a,b)=>a.x-b.x),text:r.items.map(i=>i.text).join(' ')}));
}
function findPowerColumns(rows){
  let best=null;
  rows.forEach((row,ri)=>{
    const found=[];
    row.items.forEach(i=>{const match=i.text.match(/^(4[0-9]{2}|5[0-9]{2})$/);if(match)found.push({power:Number(match[1]),x:i.x+(i.w||0)/2})});
    if(found.length>=2 && (!best || found.length>best.cols.length)) best={rowIndex:ri,cols:found};
  });
  return best;
}
function rowValues(row, cols){
  return cols.map((col,idx)=>{
    const left=idx===0?col.x-22:(cols[idx-1].x+col.x)/2;
    const right=idx===cols.length-1?col.x+80:(col.x+cols[idx+1].x)/2;
    return clean(row.items.filter(i=>i.x>=left && i.x<right).map(i=>i.text).join(' '));
  });
}
function parseGeneral(full, module){
  const text=full.replace(/\s+/g,' ');
  const model=text.match(/(TSM-[A-Z0-9.]+)/i); if(model) setValue(module,'model',model[1]);
  if(/Trina/i.test(text)) setValue(module,'manufacturerSeries','Trina Solar – Vertex S+');
  const tech=text.match(/(N-type i-TOPCon Ultra[^\n]{0,40}(?:dual glass )?monocrystalline module)/i); if(tech) setValue(module,'technology',tech[1]); else if(/N-type i-TOPCon Ultra/i.test(text)) setValue(module,'technology','N-type i-TOPCon Ultra, dual glass monocrystalline');
}
function parseRows(rows, powerInfo, modules){
  let section='stc';
  rows.forEach((row,idx)=>{
    const label=clean(row.items.filter(i=>i.x<powerInfo.cols[0].x-24).map(i=>i.text).join(' '));
    const n=norm(label);
    if(/electrical data.*noct|noct.*electrical/.test(n)){section='noct';return}
    if(/electrical data.*stc/.test(n)){section='stc';return}
    if(/temperature rating/.test(n)){section='temperature';return}
    if(/application conditions/.test(n)){section='temperature';return}
    if(/mechanical data/.test(n)){section='mechanical';return}
    if(/warranty/.test(n)){section='warranty';return}
    const key=fieldKey(label,section); if(!key) return;
    const values=rowValues(row,powerInfo.cols);
    values.forEach((value,i)=>{if(modules[i]) setValue(modules[i],key,value)});
  });
}
function parseSingleValueRows(rows, modules){
  rows.forEach(row=>{
    const label=clean(row.items.map(i=>i.text).join(' '));
    const key=fieldKey(label,'temperature'); if(!key || ['pmax','vmpp','impp','voc','isc','efficiency','powerSelection'].includes(key)) return;
    const values=row.items.slice(1).map(i=>i.text).join(' ');
    if(values) modules.forEach(m=>{if(!m.data[key].found)setValue(m,key,values)});
  });
}
function fallbackExtract(full, modules){
  const text=full.replace(/\s+/g,' ');
  const shared=[['operatingTemp',/Operating Temperature\s*:?\s*(-?\d+\s*~\s*\+?\d+\s*°?C)/i],['maxVoltage',/Maximum System Voltage\s*:?\s*([0-9,]+\s*V\s*DC[^ ]*)/i],['fuse',/Max(?:imum)? Series Fuse Rating\s*:?\s*([0-9.]+\s*A)/i],['noct',/NOCT\s*:?\s*([0-9]+\s*\(?.{0,4}\)?)/i]];
  shared.forEach(([key,re])=>{const m=text.match(re);if(m)modules.forEach(x=>setValue(x,key,m[1]))});
}
async function extractPdf(file){
  const pdfjs=await loadPdfjs();
  const buffer=await file.arrayBuffer();
  const pdf=await pdfjs.getDocument({data:buffer}).promise;
  const allRows=[]; let full='';
  for(let p=1;p<=pdf.numPages;p++){
    progressLabel.textContent=`Reading page ${p} of ${pdf.numPages}…`;
    const page=await pdf.getPage(p); const content=await page.getTextContent();
    const rows=itemRows(content.items); allRows.push(...rows); full += content.items.map(i=>i.str).join(' ')+' ';
    const pct=Math.round((p/pdf.numPages)*55); progressBar.style.width=pct+'%'; progressPercent.textContent=pct+'%';
  }
  progressLabel.textContent='Detecting module columns…'; progressBar.style.width='68%'; progressPercent.textContent='68%';
  const powerInfo=findPowerColumns(allRows);
  if(!powerInfo) throw new Error('Could not find a multi-rating power table. Try a datasheet with a visible electrical-data table.');
  const detected=[...new Map(powerInfo.cols.map(c=>[c.power,c])).values()].sort((a,b)=>a.power-b.power);
  modules=detected.map(c=>blankModule(c.power));
  parseGeneral(full,modules[0]);
  modules.forEach((m,i)=>{ if(i>0){m.data.manufacturerSeries={...modules[0].data.manufacturerSeries};m.data.model={...modules[0].data.model};m.data.technology={...modules[0].data.technology};} });
  parseRows(allRows,powerInfo,modules); parseSingleValueRows(allRows,modules); fallbackExtract(full,modules);
  // Shared identity fields are copied to every module.
  ['manufacturerSeries','technology','operatingTemp','maxVoltage','fuse','noct','tempPmax','tempVoc','tempIsc','cells','dimensions','weight','frontGlass','backGlass','frame','junctionBox','cable','connector','testLoad','packaging','productWarranty','powerGuarantee','degradation'].forEach(key=>{
    const source=modules.find(m=>m.data[key].found); if(source) modules.forEach(m=>{if(!m.data[key].found)m.data[key]={...source.data[key]}});
  });
  progressLabel.textContent='Ready for review'; progressBar.style.width='100%'; progressPercent.textContent='100%';
  return modules;
}
function render(){
  reviewPanel.classList.remove('hidden'); dropZone.classList.add('hidden');
  const missing=modules.reduce((n,m)=>n+Object.values(m.data).filter(v=>!v.found||!v.value).length,0);
  reviewTitle.textContent=`${modules.length} module${modules.length===1?'':'s'} detected`;
  reviewSummary.textContent=`${modules.map(m=>m.power+' W').join(' · ')}  ·  ${missing} field${missing===1?'':'s'} flagged for review`;
  moduleTabs.innerHTML=modules.map((m,i)=>`<button class="module-tab ${i===activeModule?'active':''}" data-index="${i}" role="tab" aria-selected="${i===activeModule}">${m.power}W</button>`).join('');
  moduleTabs.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{activeModule=Number(b.dataset.index);renderTable();renderTabs()}));
  renderTable(); renderTabs();
}
function renderTabs(){moduleTabs.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===activeModule));}
function renderTable(){
  const m=modules[activeModule];
  tableWrap.innerHTML=`<table class="data-table"><thead><tr><th>Parameter</th><th>${m.power}W value</th><th>Unit / status</th></tr></thead><tbody>${SECTION_DEFS.map(section=>`<tr class="section-row"><td colspan="3">${section.title}</td></tr>${section.rows.map(([key,label,unit])=>{const cell=m.data[key]||{value:'',found:false};const review=!cell.found||!cell.value;return `<tr class="${review?'needs-review':''}"><td class="param">${label}</td><td><input data-key="${key}" value="${escapeHtml(cell.value)}" aria-label="${label}" /></td><td class="unit">${unit||''} ${review?'<span class="flag">· review</span>':'<span>· detected</span>'}</td></tr>`}).join('')}`).join('')}</tbody></table>`;
  tableWrap.querySelectorAll('input').forEach(input=>input.addEventListener('input',e=>{const key=e.target.dataset.key;m.data[key].value=e.target.value;m.data[key].found=Boolean(e.target.value.trim());e.target.closest('tr').classList.toggle('needs-review',!m.data[key].found);e.target.parentElement.nextElementSibling.innerHTML=`${SECTION_DEFS.flatMap(s=>s.rows).find(r=>r[0]===key)?.[2]||''} ${m.data[key].found?'<span>· detected</span>':'<span class="flag">· review</span>'}`;reviewSummary.textContent=`${modules.map(x=>x.power+' W').join(' · ')}  ·  ${modules.reduce((n,x)=>n+Object.values(x.data).filter(v=>!v.found||!v.value).length,0)} fields flagged for review`}));
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function excelRows(m){
  const rows=[['PV MODULE – DATA SUMMARY','', ''],[`SOLAR PV MODULE – ${m.power} W`,'','']];
  SECTION_DEFS.forEach(section=>{rows.push([section.title,'','']);section.rows.forEach(([key,label,unit])=>rows.push([label,m.data[key]?.value||'',unit]))});
  return rows;
}
function downloadExcel(){
  const wb=XLSX.utils.book_new();
  modules.forEach(m=>{
    const ws=XLSX.utils.aoa_to_sheet(excelRows(m));
    ws['!cols']=[{wch:34},{wch:46},{wch:16}];
    ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:2}},{s:{r:1,c:0},e:{r:1,c:2}}];
    const end=excelRows(m).length;
    for(let r=0;r<end;r++)for(let c=0;c<3;c++){const cell=ws[XLSX.utils.encode_cell({r,c})];if(!cell)continue;cell.s={font:{name:'Arial',sz:r<2?12:10,bold:r<2||c===0,color:{rgb:'163D31'}},alignment:{vertical:'center',wrap_text:true},fill:r<2?{fgColor:{rgb:'DDF2E6'}}:({fgColor:{rgb:'FFFFFF'}})}}
    let row=2; SECTION_DEFS.forEach(s=>{ws[XLSX.utils.encode_cell({r:row,c:0})].s={font:{bold:true,color:{rgb:'075843'}},fill:{fgColor:{rgb:'DDF2E6'}}};for(let c=0;c<3;c++)ws[XLSX.utils.encode_cell({r:row,c:c})].s={font:{bold:true,color:{rgb:'075843'}},fill:{fgColor:{rgb:'DDF2E6'}}};row+=1+s.rows.length});
    ws['!rows']=[{hpt:24},{hpt:22}];
    XLSX.utils.book_append_sheet(wb,ws,`${m.power}W`.slice(0,31));
  });
  XLSX.writeFile(wb,`pv-module-data-${new Date().toISOString().slice(0,10)}.xlsx`);
}
function showError(message){errorPanel.textContent=message;errorPanel.classList.remove('hidden');progressPanel.classList.add('hidden')}
async function handleFile(file){
  if(!file || file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')) return showError('Please choose a PDF datasheet.');
  errorPanel.classList.add('hidden'); fileStatus.textContent=`Selected: ${file.name}`;fileStatus.classList.remove('hidden');progressPanel.classList.remove('hidden');progressBar.style.width='8%';progressPercent.textContent='8%';
  try{await extractPdf(file);activeModule=0;render()}catch(err){console.error(err);showError(err.message||'The PDF could not be read.');}
}
dropZone.addEventListener('click',e=>{if(e.target!==browseButton)fileInput.click()});browseButton.addEventListener('click',e=>{e.stopPropagation();fileInput.click()});fileInput.addEventListener('change',e=>handleFile(e.target.files[0]));
['dragenter','dragover'].forEach(type=>dropZone.addEventListener(type,e=>{e.preventDefault();dropZone.classList.add('is-dragging')}));['dragleave','drop'].forEach(type=>dropZone.addEventListener(type,e=>{e.preventDefault();dropZone.classList.remove('is-dragging')}));dropZone.addEventListener('drop',e=>handleFile(e.dataTransfer.files[0]));
downloadButton.addEventListener('click',downloadExcel);resetButton.addEventListener('click',()=>{modules=[];fileInput.value='';fileStatus.classList.add('hidden');progressPanel.classList.add('hidden');reviewPanel.classList.add('hidden');errorPanel.classList.add('hidden');dropZone.classList.remove('hidden')});
