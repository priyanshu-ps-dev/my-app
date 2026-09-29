const STORAGE_KEY='promise-ledger.records.v1';
let records=load();
let activeFilter='all';
let activeHistoryId=null;

const els={
  stats:document.getElementById('stats'),rows:document.getElementById('promiseRows'),tableWrap:document.getElementById('tableWrap'),empty:document.getElementById('emptyState'),count:document.getElementById('recordCount'),title:document.getElementById('queueTitle'),search:document.getElementById('searchInput'),modal:document.getElementById('promiseModal'),form:document.getElementById('promiseForm'),historyModal:document.getElementById('historyModal'),historyList:document.getElementById('historyList'),historyTitle:document.getElementById('historyTitle'),historyForm:document.getElementById('historyForm')
};

function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(records))}
function today(){return new Date().toISOString().slice(0,10)}
function money(v){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0))}
function dateLabel(v){if(!v)return'—';return new Date(v+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function statusOf(r){if(r.paid)return'paid';if(r.promiseDate<today())return'overdue';if(r.promiseDate===today())return'today';return'upcoming'}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function filtered(){const q=els.search.value.trim().toLowerCase();return records.filter(r=>{const s=statusOf(r);const matchesFilter=activeFilter==='all'||s===activeFilter;const blob=[r.customer,r.phone,r.note,...(r.history||[]).map(h=>h.note)].join(' ').toLowerCase();return matchesFilter&&(!q||blob.includes(q));}).sort((a,b)=>a.paid-b.paid||a.promiseDate.localeCompare(b.promiseDate))}

function renderStats(){const unpaid=records.filter(r=>!r.paid);const overdue=unpaid.filter(r=>statusOf(r)==='overdue');const dueToday=unpaid.filter(r=>statusOf(r)==='today');const collected=records.filter(r=>r.paid);const total=a=>a.reduce((s,r)=>s+Number(r.amount||0),0);els.stats.innerHTML=`
  <article class="stat-card"><span>Outstanding</span><strong>${money(total(unpaid))}</strong><small>${unpaid.length} open promises</small></article>
  <article class="stat-card"><span>Overdue</span><strong class="danger-text">${money(total(overdue))}</strong><small>${overdue.length} need attention</small></article>
  <article class="stat-card"><span>Due today</span><strong>${money(total(dueToday))}</strong><small>${dueToday.length} follow-ups today</small></article>
  <article class="stat-card"><span>Collected</span><strong>${money(total(collected))}</strong><small>${collected.length} marked paid</small></article>`}
}

function render(){renderStats();const data=filtered();const labels={all:'All promises',overdue:'Overdue promises',today:'Due today',upcoming:'Upcoming promises',paid:'Paid promises'};els.title.textContent=labels[activeFilter];els.count.textContent=`${data.length} record${data.length===1?'':'s'}`;els.empty.classList.toggle('hidden',data.length>0);els.tableWrap.classList.toggle('hidden',data.length===0);els.rows.innerHTML=data.map(r=>{const s=statusOf(r);const last=(r.history||[]).at(-1);return `<tr>
<td><span class="customer-name">${esc(r.customer)}</span><span class="customer-meta">${esc(r.phone||'No phone')}${r.note?' • '+esc(r.note):''}</span></td>
<td class="money">${money(r.amount)}</td>
<td>${dateLabel(r.promiseDate)}</td>
<td><span class="status ${s}">${s==='today'?'Due today':s[0].toUpperCase()+s.slice(1)}</span></td>
<td>${last?`${esc(last.note.slice(0,52))}${last.note.length>52?'…':''}<span class="customer-meta">${new Date(last.at).toLocaleString('en-IN')}</span>`:'—'}</td>
<td><div class="row-actions"><button onclick="openHistory('${r.id}')">History</button>${!r.paid?`<button onclick="draftWhatsApp('${r.id}')">WhatsApp</button><button onclick="reschedule('${r.id}')">New date</button><button onclick="markPaid('${r.id}')">Mark paid</button>`:''}<button onclick="removeRecord('${r.id}')">Delete</button></div></td>
</tr>`}).join('')}

function addRecord(e){e.preventDefault();const record={id:crypto.randomUUID(),customer:document.getElementById('customer').value.trim(),phone:document.getElementById('phone').value.trim(),amount:Number(document.getElementById('amount').value),promiseDate:document.getElementById('promiseDate').value,note:document.getElementById('note').value.trim(),paid:false,paidAt:null,createdAt:new Date().toISOString(),history:[]};records.push(record);save();els.form.reset();els.modal.close();render()}

window.markPaid=id=>{const r=records.find(x=>x.id===id);if(!r)return;r.paid=true;r.paidAt=new Date().toISOString();r.history.push({note:'Payment marked as received.',at:r.paidAt});save();render()}
window.removeRecord=id=>{if(!confirm('Delete this payment promise?'))return;records=records.filter(x=>x.id!==id);save();render()}
window.reschedule=id=>{const r=records.find(x=>x.id===id);if(!r)return;const next=prompt('Enter new promise date (YYYY-MM-DD):',r.promiseDate);if(!next||!/\d{4}-\d{2}-\d{2}/.test(next))return;r.history.push({note:`Promise date updated from ${r.promiseDate} to ${next}.`,at:new Date().toISOString()});r.promiseDate=next;save();render()}
window.draftWhatsApp=id=>{const r=records.find(x=>x.id===id);if(!r)return;const text=`Hi ${r.customer}, just following up on the payment of ${money(r.amount)} that was committed for ${dateLabel(r.promiseDate)}. Please share an update when convenient. Thank you.`;navigator.clipboard.writeText(text).then(()=>alert('WhatsApp follow-up draft copied to clipboard.'))}
window.openHistory=id=>{const r=records.find(x=>x.id===id);if(!r)return;activeHistoryId=id;els.historyTitle.textContent=r.customer;renderHistory(r);els.historyModal.showModal()}
function renderHistory(r){const h=r.history||[];els.historyList.innerHTML=h.length?h.slice().reverse().map(x=>`<div class="history-item"><p>${esc(x.note)}</p><span>${new Date(x.at).toLocaleString('en-IN')}</span></div>`).join(''):'<div class="empty"><p>No follow-up notes yet.</p></div>'}

els.historyForm.addEventListener('submit',e=>{e.preventDefault();const r=records.find(x=>x.id===activeHistoryId);if(!r)return;const note=document.getElementById('historyNote').value.trim();if(!note)return;r.history.push({note,at:new Date().toISOString()});save();document.getElementById('historyNote').value='';renderHistory(r);render()})
els.form.addEventListener('submit',addRecord)
els.search.addEventListener('input',render)
document.getElementById('openModalBtn').onclick=()=>{document.getElementById('promiseDate').value=today();els.modal.showModal()}
document.getElementById('closeModalBtn').onclick=()=>els.modal.close()
document.getElementById('cancelBtn').onclick=()=>els.modal.close()
document.getElementById('closeHistoryBtn').onclick=()=>els.historyModal.close()
document.querySelectorAll('.nav-item').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));btn.classList.add('active');activeFilter=btn.dataset.filter;render()})

document.getElementById('exportBtn').onclick=()=>{const headers=['customer','phone','amount','promiseDate','note','paid'];const lines=[headers.join(','),...records.map(r=>headers.map(k=>`"${String(r[k]??'').replaceAll('"','""')}"`).join(','))];const blob=new Blob([lines.join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='promise-ledger.csv';a.click();URL.revokeObjectURL(a.href)}

document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const text=await file.text();const lines=text.trim().split(/\r?\n/);if(lines.length<2)return;const headers=lines[0].split(',').map(x=>x.replace(/^"|"$/g,''));for(const line of lines.slice(1)){const cols=line.match(/("(?:[^"]|"")*"|[^,]+)/g)||[];const obj={};headers.forEach((h,i)=>obj[h]=(cols[i]||'').replace(/^"|"$/g,'').replaceAll('""','"'));records.push({id:crypto.randomUUID(),customer:obj.customer||'Imported customer',phone:obj.phone||'',amount:Number(obj.amount||0),promiseDate:obj.promiseDate||today(),note:obj.note||'',paid:String(obj.paid).toLowerCase()==='true',paidAt:null,createdAt:new Date().toISOString(),history:[]})}save();render();e.target.value=''});

if(!records.length){const d=new Date();const iso=offset=>{const x=new Date(d);x.setDate(x.getDate()+offset);return x.toISOString().slice(0,10)};records=[
{id:crypto.randomUUID(),customer:'Apex Traders',phone:'+91 98765 43210',amount:48000,promiseDate:iso(-2),note:'Invoice #INV-1042',paid:false,paidAt:null,createdAt:new Date().toISOString(),history:[{note:'Spoke with accounts; payment expected after bank approval.',at:new Date(Date.now()-86400000).toISOString()}]},
{id:crypto.randomUUID(),customer:'Northstar Studio',phone:'+91 99887 76655',amount:27500,promiseDate:iso(0),note:'Website final milestone',paid:false,paidAt:null,createdAt:new Date().toISOString(),history:[]},
{id:crypto.randomUUID(),customer:'BluePeak Services',phone:'+91 91234 56789',amount:18000,promiseDate:iso(4),note:'Monthly retainer',paid:false,paidAt:null,createdAt:new Date().toISOString(),history:[]}
];save()}
render();
