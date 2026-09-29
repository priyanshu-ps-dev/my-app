const CACHE_KEY = 'promise-ledger-api-cache-v2';
let records = [];
let analyticsDays = [];
let filter = 'all';
let activityId = null;
let dateId = null;
let riskFocus = false;
let apiOnline = false;

const $ = (id) => document.getElementById(id);
const els = {
  stats: $('stats'), list: $('recordsList'), empty: $('emptyState'), search: $('searchInput'),
  modal: $('promiseModal'), form: $('promiseForm'), activityModal: $('activityModal'),
  activityTitle: $('activityTitle'), timeline: $('timeline'), activityForm: $('activityForm'),
  dateModal: $('dateModal'), dateForm: $('dateForm'), priority: $('priorityList'),
  toastHost: $('toastHost'), queueTitle: $('queueTitle'), queueSubtitle: $('queueSubtitle'),
  apiStatus: $('apiStatus'), footerSync: $('footerSync'), velocityChart: $('velocityChart'),
  focusRiskBtn: $('focusRiskBtn')
};

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function localDate(offset=0){ const d=new Date(); d.setDate(d.getDate()+offset); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function isoAgo(days=0,hours=0){ return new Date(Date.now()-days*86400000-hours*3600000).toISOString(); }

function fallbackSeed(){
  return [
    {id:uid(),customer:'Apex Traders',phone:'+91 98765 43210',amount:48000,promiseDate:localDate(-3),note:'Invoice #INV-1042 · Website milestone',paid:false,createdAt:isoAgo(9),paidAt:null,history:[{note:'Accounts team requested two extra days after approval.',at:isoAgo(1)}]},
    {id:uid(),customer:'Northstar Studio',phone:'+91 99887 76655',amount:27500,promiseDate:localDate(0),note:'Final design milestone',paid:false,createdAt:isoAgo(5),paidAt:null,history:[{note:'Client confirmed transfer will be initiated today.',at:isoAgo(0,3)}]},
    {id:uid(),customer:'BluePeak Services',phone:'+91 91234 56789',amount:18000,promiseDate:localDate(2),note:'Monthly retainer · September',paid:false,createdAt:isoAgo(2),paidAt:null,history:[]},
    {id:uid(),customer:'Orbit Retail',phone:'+91 90011 22334',amount:36000,promiseDate:localDate(6),note:'E-commerce phase 2',paid:false,createdAt:isoAgo(4),paidAt:null,history:[{note:'Purchase order approved. Payment scheduled next week.',at:isoAgo(0,10)}]},
    {id:uid(),customer:'PixelForge Media',phone:'+91 90123 45678',amount:22000,promiseDate:localDate(-5),note:'Campaign landing page',paid:true,createdAt:isoAgo(10),paidAt:isoAgo(1),history:[{note:'Payment received and reconciled.',at:isoAgo(1)}]},
    {id:uid(),customer:'Nova Dental',phone:'+91 93210 45670',amount:31500,promiseDate:localDate(-6),note:'Website + appointment module',paid:true,createdAt:isoAgo(14),paidAt:isoAgo(3),history:[{note:'Payment received after finance confirmation.',at:isoAgo(3)}]},
    {id:uid(),customer:'Canvas & Co.',phone:'+91 88770 11223',amount:14500,promiseDate:localDate(-8),note:'Brand landing page',paid:true,createdAt:isoAgo(13),paidAt:isoAgo(5),history:[{note:'Payment received via bank transfer.',at:isoAgo(5)}]},
    {id:uid(),customer:'Metro Fitness',phone:'+91 97654 22110',amount:42000,promiseDate:localDate(1),note:'Membership portal milestone',paid:false,createdAt:isoAgo(3),paidAt:null,history:[{note:'Owner asked for final invoice copy.',at:isoAgo(0,20)}]}
  ];
}

function saveCache(){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify(records)); }catch(_){}
}
function loadCache(){
  try{ const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); return Array.isArray(x)&&x.length?x:null; }catch(_){ return null; }
}

async function api(path, options={}){
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type':'application/json', ...(options.headers||{}) }
  });
  let data={};
  try{ data=await response.json(); }catch(_){}
  if(!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function setApiStatus(online, label){
  apiOnline = online;
  if(!els.apiStatus) return;
  els.apiStatus.classList.toggle('online', online);
  els.apiStatus.classList.toggle('offline', !online);
  els.apiStatus.classList.remove('connecting');
  els.apiStatus.querySelector('span').textContent = label || (online ? 'API online · synced' : 'Offline cache');
  els.footerSync.textContent = online ? 'REST API online · changes saved on server' : 'Offline fallback · changes cached in this browser';
  els.queueSubtitle.textContent = online ? 'Server-backed records · synced across sessions' : 'Offline fallback · browser cache active';
}

function money(v){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0)); }
function compact(v){ const n=Number(v||0); if(n>=10000000)return `₹${(n/10000000).toFixed(1)}Cr`; if(n>=100000)return `₹${(n/100000).toFixed(1)}L`; if(n>=1000)return `₹${(n/1000).toFixed(n>=10000?0:1)}K`; return money(n); }
function esc(v=''){ return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function initials(name=''){ return name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'PL'; }
function status(r){ if(r.paid)return'paid'; if(r.promiseDate<localDate())return'overdue'; if(r.promiseDate===localDate())return'today'; return'upcoming'; }
function statusText(s){ return ({paid:'Collected',overdue:'Overdue',today:'Due today',upcoming:'Upcoming'})[s]; }
function dateText(v){ return new Date(v+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function total(list){ return list.reduce((s,r)=>s+Number(r.amount||0),0); }
function daysBetween(a,b){ return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000); }
function dayKey(iso){ const d=new Date(iso); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function lastActivity(r){ return (r.history||[]).length ? (r.history||[])[(r.history||[]).length-1] : null; }

function relativeDate(v,r){
  if(r.paid)return'Completed';
  const d=daysBetween(localDate(),v);
  if(d===0)return'Today'; if(d===1)return'Tomorrow'; if(d>1)return`In ${d} days`;
  return `${Math.abs(d)} day${Math.abs(d)===1?'':'s'} overdue`;
}

function riskScore(r){
  if(r.paid) return 0;
  let score=8;
  const delta=daysBetween(localDate(),r.promiseDate);
  if(delta<0) score += Math.min(58, Math.abs(delta)*10);
  else if(delta===0) score += 34;
  else if(delta<=2) score += 16;
  if(r.amount>=50000) score += 18;
  else if(r.amount>=30000) score += 13;
  else if(r.amount>=15000) score += 7;
  const last=lastActivity(r);
  if(!last) score += 18;
  else {
    const age=(Date.now()-new Date(last.at).getTime())/86400000;
    if(age>5) score += 18;
    else if(age>2) score += 10;
    else score -= 5;
  }
  return Math.max(1,Math.min(99,Math.round(score)));
}
function riskBand(score){ return score>=65?'high':score>=35?'medium':'low'; }

function toast(title,msg='',type='success'){
  const el=document.createElement('div'); el.className='toast'+(type==='error'?' error':'');
  el.innerHTML=`<strong>${esc(title)}</strong><span>${esc(msg)}</span>`; els.toastHost.appendChild(el);
  setTimeout(()=>el.classList.add('out'),2400); setTimeout(()=>el.remove(),2800);
}

function visible(){
  const q=els.search.value.trim().toLowerCase();
  return records.filter(r=>{
    const ok=filter==='all'||status(r)===filter;
    const riskOk=!riskFocus || (!r.paid && riskScore(r)>=55);
    const text=[r.customer,r.phone,r.note,...(r.history||[]).map(h=>h.note)].join(' ').toLowerCase();
    return ok && riskOk && (!q || text.includes(q));
  }).sort((a,b)=>{
    if(riskFocus) return riskScore(b)-riskScore(a);
    return Number(a.paid)-Number(b.paid)||a.promiseDate.localeCompare(b.promiseDate);
  });
}

function renderStats(){
  const unpaid=records.filter(r=>!r.paid), overdue=unpaid.filter(r=>status(r)==='overdue'), due=unpaid.filter(r=>status(r)==='today'), paid=records.filter(r=>r.paid);
  const items=[
    ['Outstanding',total(unpaid),'₹',`${unpaid.length} open commitments`,''],
    ['Overdue',total(overdue),'!',`${overdue.length} need attention`,'danger'],
    ['Due today',total(due),'◷',`${due.length} follow-ups today`,'warn'],
    ['Collected',total(paid),'✓',`${paid.length} payments received`,'success']
  ];
  els.stats.innerHTML=items.map(x=>`<article class="stat ${x[4]}"><div class="stat-top"><span class="stat-label">${x[0]}</span><span class="stat-icon">${x[2]}</span></div><strong>${money(x[1])}</strong><small>${x[3]}</small></article>`).join('');

  const counts={all:records.length,overdue:overdue.length,today:due.length,upcoming:unpaid.filter(r=>status(r)==='upcoming').length,paid:paid.length};
  Object.entries(counts).forEach(([k,v])=>{ const a=$('badge-'+k),m=$('m-badge-'+k); if(a)a.textContent=v; if(m)m.textContent=v; });

  const portfolio=total(records), paidValue=total(paid), rate=portfolio?Math.round(paidValue/portfolio*100):0;
  $('healthRate').textContent=rate+'%'; $('healthRing').style.setProperty('--angle',(rate*3.6)+'deg');
  $('healthCollected').textContent=compact(paidValue); $('healthToday').textContent=compact(total(due)); $('healthRisk').textContent=compact(total(overdue));
  $('healthSidebar').textContent=rate+'%'; $('healthBar').style.width=Math.max(5,rate)+'%';
  $('sidebarHealthText').textContent=overdue.length?`${overdue.length} overdue account${overdue.length===1?'':'s'} need recovery action.`:'No overdue accounts. Portfolio health looks strong.';
}

function renderPriority(){
  const urgent=records.filter(r=>!r.paid).sort((a,b)=>riskScore(b)-riskScore(a)).slice(0,3);
  els.priority.innerHTML=urgent.length?urgent.map(r=>{
    const score=riskScore(r), band=riskBand(score);
    return `<button class="priority-item" onclick="openActivity('${r.id}')"><div class="priority-avatar">${esc(initials(r.customer))}</div><div><strong>${esc(r.customer)}</strong><span>${relativeDate(r.promiseDate,r)} · Risk ${score}/99</span></div><div class="priority-amount"><strong>${money(r.amount)}</strong><span class="risk-text ${band}">${band.toUpperCase()}</span></div></button>`;
  }).join(''):'<div class="priority-empty">✓ No open commitments right now.</div>';
}

function renderIntelligence(){
  const unpaid=records.filter(r=>!r.paid);
  const high=unpaid.filter(r=>riskScore(r)>=65);
  const overdue=unpaid.filter(r=>status(r)==='overdue');
  const recentFollowed=unpaid.filter(r=>{
    const last=lastActivity(r); if(!last)return false;
    return (Date.now()-new Date(last.at).getTime()) <= 3*86400000;
  });
  const coverage=unpaid.length?Math.round(recentFollowed.length/unpaid.length*100):100;
  const avgOverdue=overdue.length?Math.round(overdue.reduce((s,r)=>s+Math.abs(daysBetween(localDate(),r.promiseDate)),0)/overdue.length):0;
  $('riskExposure').textContent=compact(total(high));
  $('followupCoverage').textContent=coverage+'%';
  $('averageOverdue').textContent=avgOverdue+'d';

  const top=unpaid.slice().sort((a,b)=>riskScore(b)-riskScore(a))[0];
  if(top){
    $('nextAction').innerHTML=`<span>Next best action</span><strong>Follow up with ${esc(top.customer)} first.</strong><p>${money(top.amount)} exposure · ${relativeDate(top.promiseDate,top)} · risk score ${riskScore(top)}/99.</p>`;
  }else{
    $('nextAction').innerHTML=`<span>Next best action</span><strong>No collection action needed.</strong><p>All current commitments are marked as collected.</p>`;
  }
}

function deriveAnalytics(){
  const days=[];
  for(let offset=6;offset>=0;offset--){
    const d=new Date(); d.setDate(d.getDate()-offset); d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
    const key=d.toISOString().slice(0,10);
    days.push({
      key,label:d.toLocaleDateString('en-IN',{weekday:'short'}),
      collected:records.filter(r=>r.paidAt&&dayKey(r.paidAt)===key).reduce((s,r)=>s+Number(r.amount||0),0),
      promises:records.filter(r=>r.createdAt&&dayKey(r.createdAt)===key).reduce((s,r)=>s+Number(r.amount||0),0)
    });
  }
  return days;
}

function renderVelocity(){
  const days=analyticsDays.length?analyticsDays:deriveAnalytics();
  const max=Math.max(1,...days.flatMap(d=>[Number(d.collected||0),Number(d.promises||0)]));
  els.velocityChart.innerHTML=days.map(d=>{
    const ch=Math.max(d.collected?8:2,Math.round(Number(d.collected||0)/max*100));
    const ph=Math.max(d.promises?8:2,Math.round(Number(d.promises||0)/max*100));
    return `<div class="velocity-day"><div class="bar-pair"><i class="bar collected" style="height:${ch}%" title="Collected ${money(d.collected)}"></i><i class="bar promised" style="height:${ph}%" title="Promises ${money(d.promises)}"></i></div><span>${esc(d.label)}</span></div>`;
  }).join('');
}

function renderRecords(){
  const data=visible(), titles={all:'All promises',overdue:'Overdue promises',today:'Due today',upcoming:'Upcoming promises',paid:'Collected payments'};
  els.queueTitle.textContent=riskFocus?'High-risk focus':titles[filter];
  els.empty.classList.toggle('hidden',data.length>0);
  els.list.innerHTML=data.map(r=>{
    const s=status(r), score=riskScore(r), band=riskBand(score);
    return `<article class="record">
      <div class="customer-block"><div class="customer-avatar">${esc(initials(r.customer))}</div><div><div class="customer-name">${esc(r.customer)}</div><span class="customer-meta">${esc(r.phone||'No phone')}</span><span class="record-note">${esc(r.note||'No note')}</span></div></div>
      <div><div class="amount">${money(r.amount)}</div><div class="date-sub">Amount</div></div>
      <div><div class="date-main">${dateText(r.promiseDate)}</div><div class="date-sub">${relativeDate(r.promiseDate,r)}</div></div>
      <div class="status-stack"><span class="status ${s}">${statusText(s)}</span>${r.paid?'':`<span class="risk-badge ${band}">Risk ${score}</span>`}</div>
      <div class="record-actions">
        <button class="action" onclick="openActivity('${r.id}')">Timeline</button>
        ${r.paid?'':`<button class="action" onclick="whatsapp('${r.id}')">WhatsApp</button><button class="action" onclick="openDate('${r.id}')">Reschedule</button><button class="action success" onclick="markPaid('${r.id}')">Mark paid</button>`}
        <button class="action danger" onclick="removeRecord('${r.id}')">Delete</button>
      </div>
    </article>`;
  }).join('');
}

function render(){ renderStats(); renderPriority(); renderIntelligence(); renderVelocity(); renderRecords(); }

async function refreshAnalytics(){
  if(!apiOnline){ analyticsDays=deriveAnalytics(); return; }
  try{ const data=await api('/api/analytics'); analyticsDays=data.days||[]; }
  catch(_){ analyticsDays=deriveAnalytics(); }
}

function syncFromPayload(data){
  if(Array.isArray(data.records)){ records=data.records; saveCache(); }
}

async function serverMutation(path, method, body){
  if(!apiOnline) throw new Error('offline');
  const data=await api(path,{method,body:body===undefined?undefined:JSON.stringify(body)});
  syncFromPayload(data);
  await refreshAnalytics();
  render();
  return data;
}

function openPromise(){ $('promiseDate').value=localDate(); els.modal.showModal(); setTimeout(()=>$('customer').focus(),50); }

els.form.addEventListener('submit',async e=>{
  e.preventDefault();
  const customer=$('customer').value.trim(), amount=Number($('amount').value), promiseDate=$('promiseDate').value;
  if(!customer||!amount||!promiseDate){toast('Missing details','Customer, amount and promise date are required.','error');return;}
  const payload={customer,phone:$('phone').value.trim(),amount,promiseDate,note:$('note').value.trim()};
  try{
    if(apiOnline) await serverMutation('/api/promises','POST',payload);
    else {
      records.push({...payload,id:uid(),paid:false,createdAt:new Date().toISOString(),paidAt:null,history:[{note:`Payment promise recorded for ${promiseDate}.`,at:new Date().toISOString()}]});
      saveCache(); analyticsDays=deriveAnalytics(); render();
    }
    els.form.reset(); els.modal.close(); toast('Promise added',customer+' was added to the queue.');
  }catch(err){ toast('Could not save',err.message,'error'); }
});

window.markPaid=async id=>{
  const r=records.find(x=>x.id===id); if(!r)return;
  try{
    if(apiOnline) await serverMutation(`/api/promises/${encodeURIComponent(id)}`,'PATCH',{paid:true});
    else { r.paid=true;r.paidAt=new Date().toISOString();r.history=r.history||[];r.history.push({note:'Payment marked as received.',at:r.paidAt});saveCache();analyticsDays=deriveAnalytics();render(); }
    toast('Payment collected',`${r.customer} marked as paid.`);
  }catch(err){toast('Could not update',err.message,'error');}
};

window.removeRecord=async id=>{
  const r=records.find(x=>x.id===id); if(!r)return;
  if(!confirm(`Delete ${r.customer}?`))return;
  try{
    if(apiOnline) await serverMutation(`/api/promises/${encodeURIComponent(id)}`,'DELETE');
    else {records=records.filter(x=>x.id!==id);saveCache();analyticsDays=deriveAnalytics();render();}
    toast('Record deleted',r.customer);
  }catch(err){toast('Could not delete',err.message,'error');}
};

window.whatsapp=id=>{
  const r=records.find(x=>x.id===id); if(!r)return;
  const message=`Hi ${r.customer}, just following up on the ${money(r.amount)} payment promised for ${dateText(r.promiseDate)}. Please share an update when convenient. Thank you.`;
  const phone=(r.phone||'').replace(/\D/g,''); const url=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  if(phone.length>=8) window.open(url,'_blank','noopener'); else navigator.clipboard?.writeText(message).then(()=>toast('Message copied','No valid WhatsApp number was saved.'));
};

window.openActivity=id=>{
  const r=records.find(x=>x.id===id); if(!r)return; activityId=id; els.activityTitle.textContent=r.customer; renderTimeline(r); els.activityModal.showModal();
};
function renderTimeline(r){
  const list=(r.history||[]).slice().reverse();
  els.timeline.innerHTML=list.length?list.map(h=>`<div class="timeline-item"><p>${esc(h.note)}</p><span>${new Date(h.at).toLocaleString('en-IN')}</span></div>`).join(''):'<div class="priority-empty">No follow-up notes yet.</div>';
}
els.activityForm.addEventListener('submit',async e=>{
  e.preventDefault(); const r=records.find(x=>x.id===activityId); if(!r)return;
  const note=$('activityNote').value.trim(); if(!note)return;
  try{
    if(apiOnline) await serverMutation(`/api/promises/${encodeURIComponent(activityId)}/history`,'POST',{note});
    else {r.history=r.history||[];r.history.push({note,at:new Date().toISOString()});saveCache();render();}
    $('activityNote').value=''; const updated=records.find(x=>x.id===activityId); if(updated)renderTimeline(updated); toast('Follow-up saved',r.customer);
  }catch(err){toast('Could not save note',err.message,'error');}
});

window.openDate=id=>{ const r=records.find(x=>x.id===id); if(!r)return; dateId=id; $('newDate').value=r.promiseDate; els.dateModal.showModal(); };
els.dateForm.addEventListener('submit',async e=>{
  e.preventDefault(); const r=records.find(x=>x.id===dateId); if(!r)return; const next=$('newDate').value; if(!next)return;
  try{
    if(apiOnline) await serverMutation(`/api/promises/${encodeURIComponent(dateId)}`,'PATCH',{promiseDate:next});
    else {const old=r.promiseDate;r.promiseDate=next;r.history=r.history||[];r.history.push({note:`Promise date changed from ${old} to ${next}.`,at:new Date().toISOString()});saveCache();render();}
    els.dateModal.close(); toast('Date updated',r.customer);
  }catch(err){toast('Could not reschedule',err.message,'error');}
});

function setFilter(next){
  filter=next; riskFocus=false; els.focusRiskBtn.classList.remove('active');
  document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
  renderRecords();
}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
$('addBtn').addEventListener('click',openPromise); $('mobileAddBtn').addEventListener('click',openPromise); $('emptyAddBtn').addEventListener('click',openPromise);
els.search.addEventListener('input',renderRecords);

els.focusRiskBtn.addEventListener('click',()=>{
  riskFocus=!riskFocus; filter='all';
  document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',!riskFocus&&b.dataset.filter==='all'));
  els.focusRiskBtn.classList.toggle('active',riskFocus);
  renderRecords();
  toast(riskFocus?'Risk focus enabled':'Risk focus cleared',riskFocus?'Showing accounts with risk score 55+.':'Showing the full queue.');
});

$('resetBtn').addEventListener('click',async()=>{
  try{
    if(apiOnline){ const data=await serverMutation('/api/reset','POST',{}); syncFromPayload(data); }
    else { records=fallbackSeed();saveCache();analyticsDays=deriveAnalytics();render(); }
    filter='all';riskFocus=false;els.search.value='';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));els.focusRiskBtn.classList.remove('active');render();toast('Demo reset','Sample data restored.');
  }catch(err){toast('Could not reset',err.message,'error');}
});

$('exportBtn').addEventListener('click',()=>{
  const headers=['customer','phone','amount','promiseDate','note','paid','riskScore'];
  const rows=[headers.join(','),...records.map(r=>headers.map(k=>{
    const value=k==='riskScore'?riskScore(r):(r[k]??'');
    return `"${String(value).replaceAll('"','""')}"`;
  }).join(','))];
  const blob=new Blob([rows.join('\n')],{type:'text/csv'}), a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='promise-ledger-export.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape') document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  if(e.key==='/' && document.activeElement?.tagName!=='INPUT' && document.activeElement?.tagName!=='TEXTAREA'){e.preventDefault();els.search.focus();}
  if((e.key==='n'||e.key==='N') && document.activeElement?.tagName!=='INPUT' && document.activeElement?.tagName!=='TEXTAREA') openPromise();
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();riskFocus=!riskFocus;els.focusRiskBtn.classList.toggle('active',riskFocus);renderRecords();}
});

async function bootstrap(){
  try{
    const health=await api('/api/health');
    const [promiseData,analyticsData]=await Promise.all([api('/api/promises'),api('/api/analytics')]);
    records=promiseData.records||[]; analyticsDays=analyticsData.days||[]; saveCache();
    setApiStatus(true,`API online · v${health.version}`);
  }catch(err){
    records=loadCache()||fallbackSeed(); analyticsDays=deriveAnalytics();
    setApiStatus(false,'Offline cache');
    toast('Backend unavailable','Using local fallback so the demo remains usable.','error');
  }
  render();
}

bootstrap();