const STORAGE_KEY = 'promise-ledger.records.v2';
let records = loadRecords();
let activeFilter = 'all';
let activeHistoryId = null;
let activeRescheduleId = null;

const $ = (id) => document.getElementById(id);
const els = {
  stats: $('stats'), rows: $('promiseRows'), tableWrap: $('tableWrap'), empty: $('emptyState'),
  count: $('recordCount'), title: $('queueTitle'), search: $('searchInput'), modal: $('promiseModal'),
  form: $('promiseForm'), historyModal: $('historyModal'), historyList: $('historyList'),
  historyTitle: $('historyTitle'), historyForm: $('historyForm'), rescheduleModal: $('rescheduleModal'),
  rescheduleForm: $('rescheduleForm'), priorityList: $('priorityList'), toastHost: $('toastHost'),
  confettiHost: $('confettiHost')
};

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
}

function today() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isoOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function seedData() {
  return [
    { id: uid(), customer: 'Apex Traders', phone: '+91 98765 43210', amount: 48000, promiseDate: isoOffset(-2), note: 'Invoice #INV-1042 · Website milestone', paid: false, paidAt: null, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), history: [{ note: 'Accounts team requested two extra days after internal approval.', at: new Date(Date.now() - 86400000).toISOString() }] },
    { id: uid(), customer: 'Northstar Studio', phone: '+91 99887 76655', amount: 27500, promiseDate: isoOffset(0), note: 'Final design milestone', paid: false, paidAt: null, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), history: [{ note: 'Client confirmed transfer will be initiated today.', at: new Date(Date.now() - 3 * 3600000).toISOString() }] },
    { id: uid(), customer: 'BluePeak Services', phone: '+91 91234 56789', amount: 18000, promiseDate: isoOffset(4), note: 'Monthly retainer · September', paid: false, paidAt: null, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), history: [] },
    { id: uid(), customer: 'Orbit Retail', phone: '+91 90011 22334', amount: 36000, promiseDate: isoOffset(8), note: 'E-commerce phase 2', paid: false, paidAt: null, createdAt: new Date(Date.now() - 86400000).toISOString(), history: [{ note: 'Purchase order approved. Payment scheduled for next week.', at: new Date(Date.now() - 10 * 3600000).toISOString() }] },
    { id: uid(), customer: 'PixelForge Media', phone: '+91 90123 45678', amount: 22000, promiseDate: isoOffset(-6), note: 'Campaign landing page', paid: true, paidAt: new Date(Date.now() - 4 * 86400000).toISOString(), createdAt: new Date(Date.now() - 9 * 86400000).toISOString(), history: [{ note: 'Payment received and reconciled.', at: new Date(Date.now() - 4 * 86400000).toISOString() }] }
  ];
}

function loadRecords() {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(existing) && existing.length) return existing;
  } catch (_) {}
  const seeded = seedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function compactMoney(value) {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return money(n);
}

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase() || 'PL';
}

function dateLabel(value) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dayDelta(value) {
  const a = new Date(`${today()}T00:00:00`);
  const b = new Date(`${value}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

function dateSub(value, paid) {
  if (paid) return 'Completed';
  const delta = dayDelta(value);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta > 1) return `In ${delta} days`;
  if (delta === -1) return '1 day overdue';
  return `${Math.abs(delta)} days overdue`;
}

function statusOf(r) {
  if (r.paid) return 'paid';
  if (r.promiseDate < today()) return 'overdue';
  if (r.promiseDate === today()) return 'today';
  return 'upcoming';
}

function statusLabel(status) {
  return ({ overdue: 'Overdue', today: 'Due today', upcoming: 'Upcoming', paid: 'Collected' })[status];
}

function total(list) {
  return list.reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

function filtered() {
  const q = els.search.value.trim().toLowerCase();
  return records
    .filter((r) => {
      const s = statusOf(r);
      const matchFilter = activeFilter === 'all' || s === activeFilter;
      const blob = [r.customer, r.phone, r.note, ...(r.history || []).map((h) => h.note)].join(' ').toLowerCase();
      return matchFilter && (!q || blob.includes(q));
    })
    .sort((a, b) => Number(a.paid) - Number(b.paid) || a.promiseDate.localeCompare(b.promiseDate));
}

function toast(title, message = '', type = 'success') {
  const node = document.createElement('div');
  node.className = `toast ${type === 'error' ? 'error' : ''}`;
  node.innerHTML = `<div class="toast-icon">${type === 'error' ? '!' : '✓'}</div><div><strong>${esc(title)}</strong><span>${esc(message)}</span></div>`;
  els.toastHost.appendChild(node);
  setTimeout(() => node.classList.add('out'), 2700);
  setTimeout(() => node.remove(), 3000);
}

function confetti() {
  const palette = ['#7c8cff', '#4cd8ff', '#5be0aa', '#ffd166', '#ff718c'];
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti';
    piece.style.background = palette[i % palette.length];
    piece.style.setProperty('--x', `${(Math.random() - .5) * 420}px`);
    piece.style.setProperty('--y', `${-120 - Math.random() * 320}px`);
    piece.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    piece.style.animationDelay = `${Math.random() * 90}ms`;
    els.confettiHost.appendChild(piece);
    setTimeout(() => piece.remove(), 1200);
  }
}

function renderStats() {
  const unpaid = records.filter((r) => !r.paid);
  const overdue = unpaid.filter((r) => statusOf(r) === 'overdue');
  const dueToday = unpaid.filter((r) => statusOf(r) === 'today');
  const collected = records.filter((r) => r.paid);
  const cards = [
    { label: 'Outstanding', value: total(unpaid), icon: '₹', sub: `${unpaid.length} open commitments`, cls: '', trend: 'Active pipeline' },
    { label: 'Overdue', value: total(overdue), icon: '!', sub: `${overdue.length} need attention`, cls: 'danger', trend: overdue.length ? 'Action needed' : 'All clear' },
    { label: 'Due today', value: total(dueToday), icon: '◷', sub: `${dueToday.length} follow-ups today`, cls: 'warn', trend: 'Today' },
    { label: 'Collected', value: total(collected), icon: '✓', sub: `${collected.length} payments received`, cls: 'success', trend: 'Closed' }
  ];
  els.stats.innerHTML = cards.map((c) => `<article class="stat-card ${c.cls}"><div class="stat-top"><span class="stat-label">${c.label}</span><span class="stat-icon">${c.icon}</span></div><strong class="stat-value">${money(c.value)}</strong><div class="stat-sub"><span class="trend-chip ${c.cls === 'danger' ? 'danger' : ''}">${c.trend}</span><span>${c.sub}</span></div></article>`).join('');

  $('allBadge').textContent = records.length;
  $('overdueBadge').textContent = overdue.length;
  $('todayBadge').textContent = dueToday.length;
  $('upcomingBadge').textContent = unpaid.filter((r) => statusOf(r) === 'upcoming').length;
  $('paidBadge').textContent = collected.length;

  const portfolio = total(records);
  const collectedValue = total(collected);
  const rate = portfolio ? Math.round((collectedValue / portfolio) * 100) : 0;
  $('collectionRate').textContent = `${rate}%`;
  $('collectionRing').style.setProperty('--rate', `${rate * 3.6}deg`);
  $('collectedMetric').textContent = compactMoney(collectedValue);
  $('todayMetric').textContent = compactMoney(total(dueToday));
  $('riskMetric').textContent = compactMoney(total(overdue));
  $('healthPercent').textContent = `${rate}%`;
  $('healthBar').style.width = `${Math.max(6, rate)}%`;
  $('healthText').textContent = overdue.length ? `${overdue.length} overdue commitment${overdue.length > 1 ? 's' : ''} lowering your collection health.` : 'No overdue commitments. Collection health looks strong.';
}

function renderPriority() {
  const priority = records.filter((r) => !r.paid && ['overdue', 'today'].includes(statusOf(r))).sort((a, b) => a.promiseDate.localeCompare(b.promiseDate)).slice(0, 3);
  if (!priority.length) {
    els.priorityList.innerHTML = `<div class="priority-empty">✓ No urgent follow-ups right now. Your queue is under control.</div>`;
    return;
  }
  els.priorityList.innerHTML = priority.map((r) => {
    const status = statusOf(r);
    return `<div class="priority-item"><div class="priority-avatar">${esc(initials(r.customer))}</div><div class="priority-main"><strong>${esc(r.customer)}</strong><span>${status === 'today' ? 'Promise is due today' : dateSub(r.promiseDate, false)}</span></div><div class="priority-amount"><strong>${money(r.amount)}</strong><span>${status === 'today' ? 'FOLLOW UP' : 'AT RISK'}</span></div></div>`;
  }).join('');
}

function renderRows() {
  const data = filtered();
  const labels = { all: 'All promises', overdue: 'Overdue promises', today: 'Due today', upcoming: 'Upcoming promises', paid: 'Collected payments' };
  els.title.textContent = labels[activeFilter];
  els.count.textContent = `${data.length} record${data.length === 1 ? '' : 's'}`;
  els.empty.classList.toggle('hidden', data.length > 0);
  els.tableWrap.classList.toggle('hidden', data.length === 0);

  els.rows.innerHTML = data.map((r) => {
    const s = statusOf(r);
    const last = (r.history || []).at(-1);
    const activity = last ? esc(last.note) : 'No follow-up logged yet';
    const activityTime = last ? new Date(last.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    return `<tr>
      <td><div class="customer-cell"><div class="customer-avatar">${esc(initials(r.customer))}</div><div><span class="customer-name">${esc(r.customer)}</span><span class="customer-meta">${esc(r.phone || 'No phone')} · ${esc(r.note || 'No note')}</span></div></div></td>
      <td class="money">${money(r.amount)}</td>
      <td><span class="date-main">${dateLabel(r.promiseDate)}</span><span class="date-sub">${dateSub(r.promiseDate, r.paid)}</span></td>
      <td><span class="status ${s}">${statusLabel(s)}</span></td>
      <td><span class="activity-text" title="${activity}">${activity}</span><span class="customer-meta">${activityTime}</span></td>
      <td><div class="row-actions"><button class="action-btn" onclick="openHistory('${r.id}')">Timeline</button>${!r.paid ? `<button class="action-btn" onclick="draftWhatsApp('${r.id}')">WhatsApp</button><button class="action-btn" onclick="openReschedule('${r.id}')">Reschedule</button><button class="action-btn success" onclick="markPaid('${r.id}')">Mark paid</button>` : ''}<button class="action-btn danger" onclick="removeRecord('${r.id}')">Delete</button></div></td>
    </tr>`;
  }).join('');
}

function render() {
  renderStats();
  renderPriority();
  renderRows();
}

function openNewPromise() {
  $('promiseDate').value = today();
  els.modal.showModal();
  setTimeout(() => $('customer').focus(), 80);
}

function addRecord(e) {
  e.preventDefault();
  const customer = $('customer').value.trim();
  const amount = Number($('amount').value);
  const promiseDate = $('promiseDate').value;
  if (!customer || !amount || !promiseDate) {
    els.form.classList.add('shake');
    setTimeout(() => els.form.classList.remove('shake'), 350);
    toast('Missing details', 'Customer, amount and promise date are required.', 'error');
    return;
  }
  records.push({
    id: uid(), customer, phone: $('phone').value.trim(), amount, promiseDate,
    note: $('note').value.trim(), paid: false, paidAt: null, createdAt: new Date().toISOString(),
    history: [{ note: `Payment promise recorded for ${dateLabel(promiseDate)}.`, at: new Date().toISOString() }]
  });
  save();
  els.form.reset();
  els.modal.close();
  render();
  toast('Promise added', `${customer} is now in your follow-up queue.`);
}

window.markPaid = (id) => {
  const r = records.find((x) => x.id === id);
  if (!r) return;
  r.paid = true;
  r.paidAt = new Date().toISOString();
  r.history = r.history || [];
  r.history.push({ note: 'Payment marked as received and commitment closed.', at: r.paidAt });
  save();
  render();
  confetti();
  toast('Payment collected', `${r.customer} · ${money(r.amount)} received.`);
};

window.removeRecord = (id) => {
  const r = records.find((x) => x.id === id);
  if (!r) return;
  if (!confirm(`Delete ${r.customer}'s payment promise?`)) return;
  records = records.filter((x) => x.id !== id);
  save();
  render();
  toast('Promise removed', `${r.customer} was removed from the ledger.`);
};

window.draftWhatsApp = (id) => {
  const r = records.find((x) => x.id === id);
  if (!r) return;
  const text = `Hi ${r.customer}, just following up on the payment of ${money(r.amount)} committed for ${dateLabel(r.promiseDate)}. Please share an update when convenient. Thank you.`;
  const phone = String(r.phone || '').replace(/\D/g, '');
  navigator.clipboard?.writeText(text).catch(() => {});
  if (phone.length >= 10) {
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    toast('WhatsApp opened', 'Follow-up message was also copied to your clipboard.');
  } else {
    toast('Message copied', 'No valid phone number was saved, so the draft was copied instead.');
  }
};

window.openHistory = (id) => {
  const r = records.find((x) => x.id === id);
  if (!r) return;
  activeHistoryId = id;
  els.historyTitle.textContent = r.customer;
  renderHistory(r);
  els.historyModal.showModal();
  setTimeout(() => $('historyNote').focus(), 80);
};

function renderHistory(r) {
  const h = r.history || [];
  els.historyList.innerHTML = h.length
    ? h.slice().reverse().map((x) => `<div class="history-item"><p>${esc(x.note)}</p><span>${new Date(x.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>`).join('')
    : '<div class="priority-empty">No follow-up notes yet. Add the first interaction below.</div>';
}

window.openReschedule = (id) => {
  const r = records.find((x) => x.id === id);
  if (!r) return;
  activeRescheduleId = id;
  $('rescheduleCustomer').textContent = `${r.customer} · current promise: ${dateLabel(r.promiseDate)}`;
  $('rescheduleDate').value = r.promiseDate;
  els.rescheduleModal.showModal();
};

els.rescheduleForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const r = records.find((x) => x.id === activeRescheduleId);
  const next = $('rescheduleDate').value;
  if (!r || !next) return;
  const old = r.promiseDate;
  r.promiseDate = next;
  r.history = r.history || [];
  r.history.push({ note: `Promise date rescheduled from ${dateLabel(old)} to ${dateLabel(next)}.`, at: new Date().toISOString() });
  save();
  els.rescheduleModal.close();
  render();
  toast('Promise rescheduled', `${r.customer} moved to ${dateLabel(next)}.`);
});

els.historyForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const r = records.find((x) => x.id === activeHistoryId);
  const note = $('historyNote').value.trim();
  if (!r || !note) return;
  r.history = r.history || [];
  r.history.push({ note, at: new Date().toISOString() });
  save();
  $('historyNote').value = '';
  renderHistory(r);
  render();
  toast('Follow-up saved', 'Customer timeline has been updated.');
});

function exportCsv() {
  const headers = ['customer', 'phone', 'amount', 'promiseDate', 'note', 'paid'];
  const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = [headers.join(','), ...records.map((r) => headers.map((k) => quote(r[k])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `promise-ledger-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV exported', `${records.length} records downloaded.`);
}

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { out.push(current); current = ''; }
    else current += ch;
  }
  out.push(current);
  return out;
}

$('importInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) throw new Error('No data rows found');
    const headers = parseCsvLine(lines[0]);
    let added = 0;
    for (const line of lines.slice(1)) {
      const cols = parseCsvLine(line);
      const obj = {};
      headers.forEach((h, i) => obj[h] = cols[i] ?? '');
      records.push({ id: uid(), customer: obj.customer || 'Imported customer', phone: obj.phone || '', amount: Number(obj.amount || 0), promiseDate: obj.promiseDate || today(), note: obj.note || '', paid: String(obj.paid).toLowerCase() === 'true', paidAt: null, createdAt: new Date().toISOString(), history: [{ note: 'Imported from CSV.', at: new Date().toISOString() }] });
      added++;
    }
    save();
    render();
    toast('CSV imported', `${added} records added successfully.`);
  } catch (err) {
    toast('Import failed', err.message || 'Please check the CSV format.', 'error');
  }
  e.target.value = '';
});

function resetDemo() {
  if (!confirm('Reset the demo data to its original state?')) return;
  records = seedData();
  save();
  activeFilter = 'all';
  els.search.value = '';
  document.querySelectorAll('.nav-item').forEach((x) => x.classList.toggle('active', x.dataset.filter === 'all'));
  render();
  toast('Demo reset', 'Fresh sample data has been restored.');
}

els.form.addEventListener('submit', addRecord);
els.search.addEventListener('input', renderRows);
$('openModalBtn').addEventListener('click', openNewPromise);
$('emptyAddBtn').addEventListener('click', openNewPromise);
$('closeModalBtn').addEventListener('click', () => els.modal.close());
$('cancelBtn').addEventListener('click', () => els.modal.close());
$('closeHistoryBtn').addEventListener('click', () => els.historyModal.close());
$('closeRescheduleBtn').addEventListener('click', () => els.rescheduleModal.close());
$('cancelRescheduleBtn').addEventListener('click', () => els.rescheduleModal.close());
$('exportBtn').addEventListener('click', exportCsv);
$('demoResetBtn').addEventListener('click', resetDemo);

document.querySelectorAll('.nav-item').forEach((btn) => btn.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((x) => x.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.filter;
  renderRows();
}));

document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  const typing = ['INPUT', 'TEXTAREA'].includes(tag);
  if (e.key === '/' && !typing) {
    e.preventDefault();
    els.search.focus();
  }
  if (e.key.toLowerCase() === 'n' && !typing) {
    e.preventDefault();
    openNewPromise();
  }
  if (e.key === 'Escape') {
    [els.modal, els.historyModal, els.rescheduleModal].forEach((d) => { if (d.open) d.close(); });
  }
});

const now = new Date();
$('heroDate').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
render();
setTimeout(() => toast('Workspace ready', 'Interactive demo loaded with sample collection data.'), 550);
