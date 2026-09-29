const KEY = 'promise-ledger-v3';
let records = load();
let filter = 'all';
let activityId = null;
let dateId = null;

const $ = (id) => document.getElementById(id);
const els = {
  stats: $('stats'), list: $('recordsList'), empty: $('emptyState'), search: $('searchInput'),
  modal: $('promiseModal'), form: $('promiseForm'), activityModal: $('activityModal'),
  activityTitle: $('activityTitle'), timeline: $('timeline'), activityForm: $('activityForm'),
  dateModal: $('dateModal'), dateForm: $('dateForm'), priority: $('priorityList'),
  toastHost: $('toastHost'), queueTitle: $('queueTitle')
};

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function localDate(offset=0){ const d=new Date(); d.setDate(d.getDate()+offset); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function seed(){
  return [
    {id:uid(),customer:'Apex Traders',phone:'+91 98765 43210',amount:48000,promiseDate:localDate(-2),note:'Invoice #INV-1042 · Website milestone',paid:false,history:[{note:'Accounts team requested two extra days after approval.',at:new Date(Date.now()-86400000).toISOString()}]},
    {id:uid(),customer:'Northstar Studio',phone:'+91 99887 76655',amount:27500,promiseDate:localDate(0),note:'Final design milestone',paid:false,history:[{note:'Client confirmed transfer will be initiated today.',at:new Date(Date.now()-3*3600000).toISOString()}]},
    {id:uid(),customer:'BluePeak Services',phone:'+91 91234 56789',amount:18000,promiseDate:localDate(4),note:'Monthly retainer · September',paid:false,history:[]},
    {id:uid(),customer:'Orbit Retail',phone:'+91 90011 22334',amount:36000,promiseDate:localDate(8),note:'E-commerce phase 2',paid:false,history:[{note:'Purchase order approved. Payment scheduled next week.',at:new Date(Date.now()-10*3600000).toISOString()}]},
    {id:uid(),customer:'PixelForge Media',phone:'+91 90123 45678',amount:22000,promiseDate:localDate(-5),note:'Campaign landing page',paid:true,paidAt:new Date(Date.now()-4*86400000).toISOString(),history:[{note:'Payment received and reconciled.',at:new Date(Date.now()-4*86400000).toISOString()}]}
  ];
}
function load(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    if(Array.isArray(raw) && raw.length) return raw;
  }catch(e){}
  const data=seed(); localStorage.setItem(KEY,JSON.stringify(data)); return data;
}
function save(){ localStorage.setItem(KEY,JSON.stringify(records)); }
function money(v){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0)); }
function compact(v){ const n=Number(v||0); if(n>=100000)return `₹${(n/100000).toFixed(1)}L`; if(n>=1000)return `₹${(n/1000).toFixed(n>=10000?0:1)}K`; return money(n); }
function esc(v=''){ return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function initials(name=''){ return name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'PL'; }
function status(r){ if(r.paid)return'paid'; if(r.promiseDate<localDate())return'overdue'; if(r.promiseDate===localDate())return'today'; return'upcoming'; }
function statusText(s){ return ({paid:'Collected',overdue:'Overdue',today:'Due today',upcoming:'Upcoming'})[s]; }
function dateText(v){ return new Date(v+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function relativeDate(v,r){
  if(r.paid)return'Completed';
  const a=new Date(localDate()+'T00:00:00'), b=new Date(v+'T00:00:00');
  const d=Math.round((b-a)/86400000);
  if(d===0)return'Today'; if(d===1)return'Tomorrow'; if(d>1)return`In ${d} days`;
  return `${Math.abs(d)} day${Math.abs(d)===1?'':'s'} overdue`;
}
function total(list){ return list.reduce((s,r)=>s+Number(r.amount||0),0); }
function toast(title,msg=''){
  const el=document.createElement('div'); el.className='toast';
  el.innerHTML=`<strong>${esc(title)}</strong><span>${esc(msg)}</span>`; els.toastHost.appendChild(el);
  setTimeout(()=>el.remove(),2600);
}
function visible(){
  const q=els.search.value.trim().toLowerCase();
  return records.filter(r=>{
    const ok=filter==='all'||status(r)===filter;
    const text=[r.customer,r.phone,r.note,...(r.history||[]).map(h=>h.note)].join(' ').toLowerCase();
    return ok && (!q || text.includes(q));
  }).sort((a,b)=>Number(a.paid)-Number(b.paid)||a.promiseDate.localeCompare(b.promiseDate));
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
}
function renderPriority(){
  const urgent=records.filter(r=>!r.paid&&['overdue','today'].includes(status(r))).sort((a,b)=>a.promiseDate.localeCompare(b.promiseDate)).slice(0,3);
  els.priority.innerHTML=urgent.length?urgent.map(r=>`<div class="priority-item"><div class="priority-avatar">${esc(initials(r.customer))}</div><div><strong>${esc(r.customer)}</strong><span>${status(r)==='today'?'Promise is due today':relativeDate(r.promiseDate,r)}</span></div><div class="priority-amount"><strong>${money(r.amount)}</strong><span>${status(r)==='today'?'FOLLOW UP':'AT RISK'}</span></div></div>`).join(''):'<div class="priority-empty">✓ No urgent follow-ups right now.</div>';
}
function renderRecords(){
  const data=visible(), titles={all:'All promises',overdue:'Overdue promises',today:'Due today',upcoming:'Upcoming promises',paid:'Collected payments'};
  els.queueTitle.textContent=titles[filter];
  els.empty.classList.toggle('hidden',data.length>0);
  els.list.innerHTML=data.map(r=>{
    const s=status(r);
    return `<article class="record">
      <div class="customer-block"><div class="customer-avatar">${esc(initials(r.customer))}</div><div><div class="customer-name">${esc(r.customer)}</div><span class="customer-meta">${esc(r.phone||'No phone')}</span><span class="record-note">${esc(r.note||'No note')}</span></div></div>
      <div><div class="amount">${money(r.amount)}</div><div class="date-sub">Amount</div></div>
      <div><div class="date-main">${dateText(r.promiseDate)}</div><div class="date-sub">${relativeDate(r.promiseDate,r)}</div></div>
      <div><span class="status ${s}">${statusText(s)}</span></div>
      <div class="record-actions">
        <button class="action" onclick="openActivity('${r.id}')">Timeline</button>
        ${r.paid?'':`<button class="action" onclick="whatsapp('${r.id}')">WhatsApp</button><button class="action" onclick="openDate('${r.id}')">Reschedule</button><button class="action success" onclick="markPaid('${r.id}')">Mark paid</button>`}
        <button class="action danger" onclick="removeRecord('${r.id}')">Delete</button>
      </div>
    </article>`;
  }).join('');
}
function render(){ renderStats(); renderPriority(); renderRecords(); }

function openPromise(){
  $('promiseDate').value=localDate(); els.modal.showModal(); setTimeout(()=>$('customer').focus(),50);
}
els.form.addEventListener('submit',e=>{
  e.preventDefault();
  const customer=$('customer').value.trim(), amount=Number($('amount').value), promiseDate=$('promiseDate').value;
  if(!customer||!amount||!promiseDate){toast('Missing details','Customer, amount and promise date are required.');return;}
  records.push({id:uid(),customer,phone:$('phone').value.trim(),amount,promiseDate,note:$('note').value.trim(),paid:false,history:[{note:`Promise recorded for ${dateText(promiseDate)}.`,at:new Date().toISOString()}]});
  save(); els.form.reset(); els.modal.close(); render(); toast('Promise added',customer+' was added to the queue.');
});
window.markPaid=id=>{
  const r=records.find(x=>x.id===id); if(!r)return; r.paid=true; r.paidAt=new Date().toISOString(); r.history=r.history||[]; r.history.push({note:'Payment marked as received.',at:r.paidAt}); save(); render(); toast('Payment collected',`${r.customer} marked as paid.`);
};
window.removeRecord=id=>{
  const r=records.find(x=>x.id===id); if(!r)return;
  if(!confirm(`Delete ${r.customer}?`))return; records=records.filter(x=>x.id!==id); save(); render(); toast('Record deleted',r.customer);
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
els.activityForm.addEventListener('submit',e=>{
  e.preventDefault(); const r=records.find(x=>x.id===activityId); if(!r)return;
  const note=$('activityNote').value.trim(); if(!note)return; r.history=r.history||[]; r.history.push({note,at:new Date().toISOString()}); save(); $('activityNote').value=''; renderTimeline(r); render(); toast('Follow-up saved',r.customer);
});
window.openDate=id=>{
  const r=records.find(x=>x.id===id); if(!r)return; dateId=id; $('newDate').value=r.promiseDate; els.dateModal.showModal();
};
els.dateForm.addEventListener('submit',e=>{
  e.preventDefault(); const r=records.find(x=>x.id===dateId); if(!r)return; const next=$('newDate').value; if(!next)return;
  const old=r.promiseDate; r.promiseDate=next; r.history=r.history||[]; r.history.push({note:`Promise date changed from ${dateText(old)} to ${dateText(next)}.`,at:new Date().toISOString()}); save(); els.dateModal.close(); render(); toast('Date updated',r.customer);
});

function setFilter(next){
  filter=next;
  document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
  renderRecords();
}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
$('addBtn').addEventListener('click',openPromise); $('mobileAddBtn').addEventListener('click',openPromise); $('emptyAddBtn').addEventListener('click',openPromise);
els.search.addEventListener('input',renderRecords);
$('resetBtn').addEventListener('click',()=>{ records=seed(); save(); filter='all'; els.search.value=''; setFilter('all'); render(); toast('Demo reset','Sample data restored.'); });
$('exportBtn').addEventListener('click',()=>{
  const headers=['customer','phone','amount','promiseDate','note','paid'];
  const rows=[headers.join(','),...records.map(r=>headers.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))];
  const blob=new Blob([rows.join('\n')],{type:'text/csv'}), a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='promise-ledger.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  if(e.key==='/' && document.activeElement?.tagName!=='INPUT' && document.activeElement?.tagName!=='TEXTAREA'){e.preventDefault();els.search.focus();}
  if((e.key==='n'||e.key==='N') && document.activeElement?.tagName!=='INPUT' && document.activeElement?.tagName!=='TEXTAREA') openPromise();
});
render();