const C=window.AppCommon,$=s=>document.querySelector(s);
let baseline,control;

async function init(){
  baseline=C.fresh();
  control=await C.read('commander')||{records:[],snapshotId:null,sequence:0,importedAt:null};
  control.records=control.records||[];
  for(const x of control.records){
    if(x.tipo==='Entrada'&&(x.estado==='Recibido'||x.estado==='Entregado'))x.estado='Entregada';
    if(x.tipo==='Salida'&&x.estado==='Entregado')x.estado='Recibido';
    if(['Entregada','Recibido'].includes(x.estado)&&!x.fechaCierre)x.fechaCierre=x.fechaEntrega||x.fecha;
  }
  await C.write('commander',control);
  await syncPublishedUpdate();
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.tabs button,.panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');$('#'+b.dataset.tab).classList.add('active');
  });
  $('#groupBy').onchange=renderStats;$('#range').onchange=renderStats;
  $('#unitFilter').onchange=renderStats;$('#productFilter').onchange=renderStats;
  $('#invSearch').oninput=renderInventory;
  render();
}

function validatePacket(p){
  if(!p||p.format!=='almacen-entrega'||p.version!==1||!Array.isArray(p.records)||!p.snapshotId)throw Error('Selecciona el archivo JSON generado por el Programa de entrega.');
  if(p.baseVersion!==C.BASE_VERSION)throw Error('Este archivo usa otra versión del inventario base. Solicita el archivo correcto.');
  if(!Number.isInteger(Number(p.sequence))||Number(p.sequence)<1)throw Error('El archivo no tiene una versión válida.');
  const codes=new Set(baseline.catalog.map(x=>x.codigo)),ids=new Set();
  for(const x of p.records){
    if(!x.id||ids.has(x.id))throw Error('El archivo contiene movimientos repetidos o incompletos.');ids.add(x.id);
    if(!codes.has(String(x.codigo))||!['Entrada','Salida'].includes(x.tipo)||!x.folio||!x.fecha||!Number.isInteger(Number(x.cantidad))||Number(x.cantidad)<=0)throw Error('Hay un movimiento con datos incompletos o un consumible desconocido.');
    if(x.tipo==='Salida'&&!['Pendiente','Recibido'].includes(x.estado))throw Error('Una salida tiene un estado no reconocido.');
    if(x.tipo==='Entrada'&&!['Pendiente','Entregada'].includes(x.estado))throw Error('Una entrada tiene un estado no reconocido.');
  }
}

function isPacketNewer(packet,current){
  const incomingTime=Date.parse(packet.createdAt||''),currentTime=Date.parse(current.createdAt||'');
  if(Number.isFinite(incomingTime)&&Number.isFinite(currentTime))return incomingTime>currentTime||(incomingTime===currentTime&&Number(packet.sequence)>Number(current.sequence||0));
  return Number(packet.sequence)>Number(current.sequence||0);
}

async function syncPublishedUpdate(){
  try{
    const listUrl=`https://api.github.com/repos/BrayAguilar/CMT-Almacen/contents/actualizaciones?ref=main&ts=${Date.now()}`;
    const listing=await fetch(listUrl,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
    if(!listing.ok)return;
    const files=await listing.json();if(!Array.isArray(files))return;
    const candidates=files.filter(x=>x.type==='file'&&x.name.toLowerCase().endsWith('.json')&&x.download_url);
    let latest=null;
    for(const file of candidates){
      try{const response=await fetch(file.download_url,{cache:'no-store'});if(!response.ok)continue;const packet=await response.json();validatePacket(packet);if(!latest||isPacketNewer(packet,latest))latest=packet;}
      catch(error){console.warn(`Se omitió ${file.name}:`,error);}
    }
    if(!latest||latest.snapshotId===control.snapshotId||!isPacketNewer(latest,control))return;
    control={records:latest.records,snapshotId:latest.snapshotId,sequence:Number(latest.sequence),importedAt:new Date().toISOString(),createdAt:latest.createdAt||null,source:'publicado'};
    await C.write('commander',control);
  }catch(error){console.warn('No se pudo sincronizar la actualización publicada:',error);}
}

function events(){return control.records||[];}
function render(){
  const stock=C.stock(baseline.catalog,baseline.opening,events());
  const physical=[...stock.values()].reduce((n,x)=>n+x.fisico,0);
  const pendingOut=[...stock.values()].reduce((n,x)=>n+x.pendiente,0);
  const pendingIn=[...stock.values()].reduce((n,x)=>n+x.entradaPendiente,0);
  const available=[...stock.values()].reduce((n,x)=>n+x.disponible,0);
  const delivered=events().filter(x=>x.tipo==='Salida'&&x.estado==='Recibido').reduce((n,x)=>n+Number(x.cantidad),0);
  const low=baseline.catalog.filter(p=>C.lowState(p,stock.get(p.codigo)));
  $('#available').textContent=C.fmt(available);$('#physical').textContent=C.fmt(physical);
  $('#pendingOut').textContent=C.fmt(pendingOut);$('#pendingIn').textContent=C.fmt(pendingIn);
  $('#lowCount').textContent=C.fmt(low.length);$('#delivered').textContent=C.fmt(delivered);
  $('#updateStatus').innerHTML=control.importedAt
    ?`${control.source==='publicado'?'Información sincronizada desde GitHub':'Información actualizada'} el <b>${C.esc(new Date(control.importedAt).toLocaleString('es-MX'))}</b>. Archivo número ${C.fmt(control.sequence)}.`
    :'<b>Esperando la primera actualización.</b> Los movimientos se sincronizan automáticamente desde el repositorio al abrir esta aplicación.';
  const recent=events().filter(x=>(x.tipo==='Entrada'&&x.estado==='Entregada')||(x.tipo==='Salida'&&x.estado==='Recibido')).sort((a,b)=>C.eventDate(b).localeCompare(C.eventDate(a))).slice(0,10);
  $('#latest').innerHTML=recent.length?C.table(['Fecha','Folio','Movimiento','Unidad / proveedor','Consumible','Cantidad'],recent.map(x=>[
    C.esc(C.eventDate(x)),C.esc(x.folio),x.tipo==='Entrada'?'Entrada recibida':'Salida entregada',C.esc(x.organismo),C.esc(baseline.catalog.find(p=>p.codigo===x.codigo)?.modelo||x.codigo),C.fmt(x.cantidad)
  ])):'<div class="empty">Todavía no hay movimientos confirmados.</div>';
  renderInventory();renderStats();
}

function renderInventory(){
  if(!baseline||!control)return;
  const stock=C.stock(baseline.catalog,baseline.opening,events()),q=$('#invSearch').value.trim().toLowerCase();
  const products=baseline.catalog.filter(p=>[p.codigo,p.modelo,p.descripcion,p.tipo].join(' ').toLowerCase().includes(q));
  $('#inventoryTable').innerHTML=C.table(['Código','Consumible','Existencia base','Entradas recibidas','Salidas entregadas','Apartado pendiente','Disponible'],products.map(p=>{
    const b=stock.get(p.codigo),base=baseline.opening.find(x=>x.codigo===p.codigo)?.cantidad||0;
    const incoming=events().filter(x=>x.codigo===p.codigo&&x.tipo==='Entrada'&&x.estado==='Entregada').reduce((n,x)=>n+Number(x.cantidad),0);
    return [C.esc(p.codigo),C.esc(p.modelo||p.descripcion),C.fmt(base),C.fmt(incoming),C.fmt(b.entregado),C.fmt(b.pendiente),`<b class="${C.lowState(p,b)?'low':''}">${C.fmt(b.disponible)}</b>`];
  }));
}

function monday(date){const d=new Date(date+'T00:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function periodKey(date,kind){return kind==='month'?date.slice(0,7):kind==='week'?monday(date):date;}
function selectedEvents(){
  const range=$('#range').value,from=new Date();if(range!=='all')from.setDate(from.getDate()-Number(range)+1);
  const start=range==='all'?'0000-01-01':`${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`;
  return events().filter(x=>C.inRange(x,start,C.today())&&(!$('#unitFilter').value||x.organismo===$('#unitFilter').value)&&(!$('#productFilter').value||x.codigo===$('#productFilter').value));
}

function renderStats(){
  const units=[...new Set(events().map(x=>x.organismo).filter(Boolean))].sort(),unit=$('#unitFilter'),oldUnit=unit.value;
  unit.innerHTML='<option value="">Todas</option>'+units.map(x=>`<option value="${C.esc(x)}">${C.esc(x)}</option>`).join('');if(units.includes(oldUnit))unit.value=oldUnit;
  const product=$('#productFilter'),oldProduct=product.value;
  product.innerHTML='<option value="">Todos</option>'+baseline.catalog.map(x=>`<option value="${C.esc(x.codigo)}">${C.esc(x.modelo||x.descripcion)}</option>`).join('');if(baseline.catalog.some(x=>x.codigo===oldProduct))product.value=oldProduct;
  const kind=$('#groupBy').value,chosen=selectedEvents(),buckets=new Map(),byUnit=new Map(),byProduct=new Map();let inTotal=0,outTotal=0;
  for(const x of chosen){
    const isIn=x.tipo==='Entrada'&&x.estado==='Entregada',isOut=x.tipo==='Salida'&&x.estado==='Recibido';if(!isIn&&!isOut)continue;
    const qty=Number(x.cantidad),key=periodKey(C.eventDate(x),kind);if(!buckets.has(key))buckets.set(key,{in:0,out:0});
    if(isIn){buckets.get(key).in+=qty;inTotal+=qty;}else{buckets.get(key).out+=qty;outTotal+=qty;}
    addTotal(byUnit,x.organismo||'(Sin unidad)',isIn?0:qty);
    addTotal(byProduct,x.codigo,isIn?0:qty);
  }
  $('#statsSummary').innerHTML=`<p class="notice">Con los filtros elegidos: <b>${C.fmt(outTotal)}</b> unidades entregadas (consumo) y <b>${C.fmt(inTotal)}</b> unidades recibidas por el almacén.</p>`;
  $('#statsChart').innerHTML=barChart([...buckets].sort((a,b)=>a[0].localeCompare(b[0])),kind);
  $('#byUnit').innerHTML=C.table(['Unidad','Unidades entregadas'],[...byUnit].sort((a,b)=>b[1]-a[1]).map(([k,v])=>[C.esc(k),C.fmt(v)]));
  $('#byProduct').innerHTML=C.table(['Consumible','Unidades entregadas'],[...byProduct].sort((a,b)=>b[1]-a[1]).map(([k,v])=>[C.esc(baseline.catalog.find(p=>p.codigo===k)?.modelo||k),C.fmt(v)]));
}
function addTotal(map,key,value){map.set(key,(map.get(key)||0)+value);}
function barChart(data,kind){
  if(!data.length)return '<div class="empty">No hay movimientos confirmados en este período.</div>';
  const W=Math.max(820,data.length*72+100),H=340,L=62,R=25,T=34,B=70,CH=H-T-B,CW=W-L-R,max=Math.max(1,...data.flatMap(([,v])=>[v.in,v.out])),step=CW/data.length,bw=Math.min(22,step*.28);
  let s=`<div class="chart-wrap"><svg style="width:${W}px" viewBox="0 0 ${W} ${H}" role="img" aria-label="Entradas y consumo por período"><text x="${W/2}" y="20" text-anchor="middle" font-size="14" fill="#172b4d">Entradas y consumibles entregados</text>`;
  for(let i=0;i<=4;i++){const val=max*i/4,y=T+CH-CH*i/4;s+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="#e2e8f0"/><text x="${L-8}" y="${y+4}" text-anchor="end" font-size="11" fill="#64748b">${C.fmt(Math.round(val))}</text>`;}
  data.forEach(([key,v],i)=>{const cx=L+step*i+step/2,h1=CH*v.in/max,h2=CH*v.out/max,label=kind==='month'?key:key.slice(5);s+=`<rect x="${cx-bw-2}" y="${T+CH-h1}" width="${bw}" height="${h1}" rx="3" fill="#12b76a"><title>${C.esc(key)} entradas: ${C.fmt(v.in)}</title></rect><rect x="${cx+2}" y="${T+CH-h2}" width="${bw}" height="${h2}" rx="3" fill="#155eef"><title>${C.esc(key)} entregadas: ${C.fmt(v.out)}</title></rect><text x="${cx}" y="${H-B+20}" text-anchor="middle" font-size="10" fill="#64748b">${C.esc(label)}</text>`;});
  s+=`<rect x="${W/2-130}" y="${H-22}" width="11" height="11" fill="#12b76a"/><text x="${W/2-114}" y="${H-12}" font-size="11" fill="#475569">Entradas recibidas</text><rect x="${W/2+20}" y="${H-22}" width="11" height="11" fill="#155eef"/><text x="${W/2+36}" y="${H-12}" font-size="11" fill="#475569">Entregadas</text></svg></div>`;return s;
}

init();

