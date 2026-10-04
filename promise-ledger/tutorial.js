(() => {
  const TOUR_KEY = 'promise-ledger-tour-seen-v1';
  const STEP_MS = 6200;

  const scenes = [
    {
      label: '01 · THE PROBLEM',
      title: 'See the <em>whole collections picture</em> in seconds.',
      text: 'Hisaab Saathi turns scattered payment commitments into one focused command center. Outstanding, overdue, due-today and collected amounts are visible immediately.',
      tip: 'Start here: the dashboard tells you what deserves attention before you open any customer record.',
      visual: 'dashboard'
    },
    {
      label: '02 · SMART PRIORITY',
      title: 'Know <em>who to call first</em>.',
      text: 'Every open commitment gets an explainable risk score based on overdue age, amount and follow-up recency. High-risk accounts automatically rise to the top.',
      tip: 'Use “Focus high risk” when you want a recovery queue instead of a long customer list.',
      visual: 'risk'
    },
    {
      label: '03 · NEXT BEST ACTION',
      title: 'Turn analytics into a <em>next action</em>.',
      text: 'Recovery Intelligence calculates exposure, follow-up coverage and average overdue age, then recommends the account that should be contacted next.',
      tip: 'The rule-based engine is transparent — an interviewer can understand exactly why a score changed.',
      visual: 'action'
    },
    {
      label: '04 · CUSTOMER WORKFLOW',
      title: 'Keep every follow-up in <em>one timeline</em>.',
      text: 'Open a customer, add follow-up notes, reschedule the promised date, send a WhatsApp reminder and mark the payment as collected without losing context.',
      tip: 'The customer timeline acts like a lightweight audit trail for each payment promise.',
      visual: 'timeline'
    },
    {
      label: '05 · COLLECTION SIGNALS',
      title: 'Watch <em>collections velocity</em> change.',
      text: 'A seven-day signal compares collected value with newly created promise value, so the team can see whether recoveries are keeping pace with new commitments.',
      tip: 'Marking a payment as collected updates the dashboard and analytics immediately.',
      visual: 'chart'
    },
    {
      label: '06 · FULL-STACK BEHAVIOR',
      title: 'Built to behave like a <em>real product</em>.',
      text: 'The UI talks to a Node.js REST API, validates writes, syncs records across sessions and keeps a browser fallback so the demo remains usable if the backend is temporarily unavailable.',
      tip: 'Look for the API status pill at the top — it shows whether the live backend is connected.',
      visual: 'api'
    },
    {
      label: '07 · READY',
      title: 'That is <em>Hisaab Saathi</em>.',
      text: 'Add a promise, inspect its risk score, follow up, reschedule it and mark it paid. The goal is simple: fewer missed commitments and faster collections.',
      tip: 'Best demo flow: Add Promise → Focus High Risk → Timeline → Mark Paid.',
      visual: 'success'
    }
  ];

  let dialog;
  let current = 0;
  let playing = true;
  let timer = null;
  let tick = null;
  let elapsed = 0;

  function visualMarkup(type) {
    if (type === 'dashboard') return `
      <div class="tutorial-phone">
        <div class="tutorial-mini-top"><div class="tutorial-mini-brand"><div class="tutorial-mini-logo">HS</div><strong>Hisaab Saathi</strong></div><span class="tutorial-mini-live">● LIVE</span></div>
        <div class="tutorial-mini-grid">
          <div class="tutorial-mini-card"><span>OUTSTANDING</span><strong>₹1.72L</strong><i></i></div>
          <div class="tutorial-mini-card"><span>OVERDUE</span><strong>₹48K</strong><i></i></div>
          <div class="tutorial-mini-card"><span>DUE TODAY</span><strong>₹27.5K</strong><i></i></div>
          <div class="tutorial-mini-card"><span>COLLECTED</span><strong>₹68K</strong><i></i></div>
        </div>
        <div class="tutorial-mini-section"><div class="tutorial-mini-section-head"><strong>Priority queue</strong><span>risk sorted</span></div>
          <div class="tutorial-row"><div class="avatar">AT</div><div><strong>Apex Traders</strong><span>3 days overdue</span></div><b>Risk 77</b></div>
          <div class="tutorial-row"><div class="avatar">NS</div><div><strong>Northstar Studio</strong><span>Due today</span></div><b>Risk 54</b></div>
          <div class="tutorial-row"><div class="avatar">MF</div><div><strong>Metro Fitness</strong><span>Due tomorrow</span></div><b>Risk 36</b></div>
        </div>
      </div>`;

    if (type === 'risk') return `
      <div class="tutorial-phone"><div class="tutorial-mini-top"><div class="tutorial-mini-brand"><div class="tutorial-mini-logo">⚡</div><strong>Risk engine</strong></div><span class="tutorial-mini-live">RULE-BASED</span></div>
        <div class="tutorial-risk-ring"><div><strong>77</strong><span>HIGH RISK</span></div></div>
        <div class="tutorial-mini-section"><div class="tutorial-mini-section-head"><strong>Apex Traders</strong><span>₹48,000</span></div>
          <div class="tutorial-row"><div class="avatar">1</div><div><strong>Overdue age</strong><span>+30 points</span></div><b>3 days</b></div>
          <div class="tutorial-row"><div class="avatar">2</div><div><strong>Amount exposure</strong><span>+13 points</span></div><b>₹48K</b></div>
          <div class="tutorial-row"><div class="avatar">3</div><div><strong>Follow-up recency</strong><span>recent activity lowers risk</span></div><b>1 day</b></div>
        </div>
      </div>`;

    if (type === 'action') return `
      <div class="tutorial-phone"><div class="tutorial-mini-top"><div class="tutorial-mini-brand"><div class="tutorial-mini-logo">✦</div><strong>Recovery Intelligence</strong></div><span class="tutorial-mini-live">LIVE</span></div>
        <div class="tutorial-mini-grid">
          <div class="tutorial-mini-card"><span>HIGH-RISK EXPOSURE</span><strong>₹48K</strong><i></i></div>
          <div class="tutorial-mini-card"><span>FOLLOW-UP COVERAGE</span><strong>80%</strong><i></i></div>
        </div>
        <div class="tutorial-action-card"><span>NEXT BEST ACTION</span><strong>Follow up with Apex Traders first.</strong><span>₹48,000 exposure · 3 days overdue · risk 77/99</span></div>
        <div class="tutorial-whatsapp"><b>↗</b><div><strong>Send payment follow-up</strong><span>Prefilled WhatsApp reminder ready</span></div></div>
      </div>`;

    if (type === 'timeline') return `
      <div class="tutorial-phone"><div class="tutorial-mini-top"><div class="tutorial-mini-brand"><div class="tutorial-mini-logo">AT</div><strong>Apex Traders</strong></div><span class="tutorial-mini-live">TIMELINE</span></div>
        <div class="tutorial-mini-section"><div class="tutorial-mini-section-head"><strong>Customer activity</strong><span>latest first</span></div>
          <div class="tutorial-row"><div class="avatar">✓</div><div><strong>Follow-up logged</strong><span>Accounts team requested two extra days.</span></div><b>Today</b></div>
          <div class="tutorial-row"><div class="avatar">↻</div><div><strong>Promise rescheduled</strong><span>28 Sep → 30 Sep</span></div><b>2d</b></div>
          <div class="tutorial-row"><div class="avatar">₹</div><div><strong>Promise created</strong><span>Invoice #INV-1042</span></div><b>₹48K</b></div>
        </div>
        <div class="tutorial-whatsapp"><b>WA</b><div><strong>WhatsApp follow-up</strong><span>Message opens with customer + amount + promised date</span></div></div>
      </div>`;

    if (type === 'chart') return `
      <div class="tutorial-phone"><div class="tutorial-mini-top"><div class="tutorial-mini-brand"><div class="tutorial-mini-logo">↗</div><strong>Collections velocity</strong></div><span class="tutorial-mini-live">7 DAYS</span></div>
        <div class="tutorial-chart">
          <div class="tutorial-bar" style="height:35%"></div><div class="tutorial-bar" style="height:58%"></div><div class="tutorial-bar" style="height:28%"></div><div class="tutorial-bar" style="height:76%"></div><div class="tutorial-bar" style="height:48%"></div><div class="tutorial-bar" style="height:88%"></div><div class="tutorial-bar" style="height:64%"></div>
        </div>
        <div class="tutorial-mini-grid"><div class="tutorial-mini-card"><span>COLLECTED THIS WEEK</span><strong>₹68K</strong><i></i></div><div class="tutorial-mini-card"><span>NEW PROMISES</span><strong>₹96K</strong><i></i></div></div>
        <div class="tutorial-action-card"><span>WHY IT MATTERS</span><strong>Recoveries are visible as a trend, not just a total.</strong></div>
      </div>`;

    if (type === 'api') return `
      <div class="tutorial-phone"><div class="tutorial-mini-top"><div class="tutorial-mini-brand"><div class="tutorial-mini-logo">{ }</div><strong>Full-stack status</strong></div><span class="tutorial-mini-live">● API ONLINE</span></div>
        <div class="tutorial-mini-section"><div class="tutorial-mini-section-head"><strong>REST API</strong><span>Node.js</span></div>
          <div class="tutorial-row"><div class="avatar">G</div><div><strong>GET /api/promises</strong><span>Load server-backed records</span></div><b>200</b></div>
          <div class="tutorial-row"><div class="avatar">P</div><div><strong>POST /api/promises</strong><span>Create validated commitment</span></div><b>201</b></div>
          <div class="tutorial-row"><div class="avatar">A</div><div><strong>GET /api/analytics</strong><span>7-day collections signal</span></div><b>200</b></div>
        </div>
        <div class="tutorial-action-card"><span>RESILIENCE</span><strong>Offline fallback keeps the demo usable.</strong><span>Browser cache activates only if the API is temporarily unavailable.</span></div>
      </div>`;

    return `
      <div class="tutorial-phone tutorial-success"><div class="tutorial-success-icon">✓</div><h3>Ready to explore</h3><p>Add a promise → inspect the risk score → open timeline → mark it paid.</p><div class="tutorial-action-card"><span>LIVE PROJECT</span><strong>Hisaab Saathi v2</strong><span>Full-stack collections intelligence workspace</span></div></div>`;
  }

  function buildDialog() {
    dialog = document.createElement('dialog');
    dialog.id = 'tutorialDialog';
    dialog.className = 'tutorial-dialog';
    dialog.innerHTML = `
      <div class="tutorial-shell">
        <div class="tutorial-top">
          <div class="tutorial-brand"><div class="tutorial-brand-icon">▶</div><div><strong>60-second product walkthrough</strong><span>Hisaab Saathi · interactive tutorial</span></div></div>
          <button class="tutorial-close" id="tutorialCloseBtn" aria-label="Close tutorial">×</button>
        </div>
        <div class="tutorial-stage">
          <div class="tutorial-copy">
            <span class="tutorial-step-label" id="tutorialLabel"></span>
            <h2 id="tutorialTitle"></h2>
            <p id="tutorialText"></p>
            <div class="tutorial-tip"><i>✦</i><span id="tutorialTip"></span></div>
          </div>
          <div class="tutorial-visual"><div class="tutorial-scene active" id="tutorialScene"></div></div>
        </div>
        <div class="tutorial-controls">
          <div class="tutorial-control-left">
            <button class="tutorial-control-btn" id="tutorialPrevBtn">← Back</button>
            <button class="tutorial-control-btn" id="tutorialPlayBtn">❚❚ Pause</button>
          </div>
          <div class="tutorial-progress-wrap">
            <div class="tutorial-progress-track"><div class="tutorial-progress-bar" id="tutorialProgressBar"></div></div>
            <div class="tutorial-progress-meta"><div class="tutorial-dots" id="tutorialDots"></div><span id="tutorialCounter">1 / ${scenes.length}</span></div>
          </div>
          <div class="tutorial-control-right">
            <button class="tutorial-control-btn" id="tutorialSkipBtn">Skip tour</button>
            <button class="tutorial-control-btn primary" id="tutorialNextBtn">Next →</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    document.getElementById('tutorialDots').innerHTML = scenes.map((_, i) => `<i class="tutorial-dot${i === 0 ? ' active' : ''}" data-index="${i}"></i>`).join('');
    document.getElementById('tutorialCloseBtn').addEventListener('click', closeTour);
    document.getElementById('tutorialSkipBtn').addEventListener('click', closeTour);
    document.getElementById('tutorialPrevBtn').addEventListener('click', () => go(current - 1));
    document.getElementById('tutorialNextBtn').addEventListener('click', () => current === scenes.length - 1 ? closeTour() : go(current + 1));
    document.getElementById('tutorialPlayBtn').addEventListener('click', togglePlay);
    document.querySelectorAll('.tutorial-dot').forEach(dot => dot.addEventListener('click', () => go(Number(dot.dataset.index))));
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeTour(); });
    renderScene();
  }

  function renderScene() {
    const scene = scenes[current];
    document.getElementById('tutorialLabel').textContent = scene.label;
    document.getElementById('tutorialTitle').innerHTML = scene.title;
    document.getElementById('tutorialText').textContent = scene.text;
    document.getElementById('tutorialTip').textContent = scene.tip;
    const node = document.getElementById('tutorialScene');
    node.classList.remove('active');
    node.innerHTML = visualMarkup(scene.visual);
    requestAnimationFrame(() => node.classList.add('active'));
    document.getElementById('tutorialCounter').textContent = `${current + 1} / ${scenes.length}`;
    document.getElementById('tutorialNextBtn').textContent = current === scenes.length - 1 ? 'Explore app →' : 'Next →';
    document.getElementById('tutorialPrevBtn').disabled = current === 0;
    document.querySelectorAll('.tutorial-dot').forEach((dot, i) => dot.classList.toggle('active', i === current));
    elapsed = 0;
    updateProgress();
    if (playing) restartTimer();
  }

  function go(index) {
    current = Math.max(0, Math.min(scenes.length - 1, index));
    renderScene();
  }

  function updateProgress() {
    const perScene = 100 / scenes.length;
    const sceneProgress = Math.min(1, elapsed / STEP_MS);
    document.getElementById('tutorialProgressBar').style.width = `${(current * perScene) + (sceneProgress * perScene)}%`;
  }

  function restartTimer() {
    clearInterval(tick);
    clearTimeout(timer);
    const started = Date.now();
    tick = setInterval(() => {
      elapsed = Math.min(STEP_MS, Date.now() - started);
      updateProgress();
    }, 100);
    timer = setTimeout(() => {
      clearInterval(tick);
      if (!playing || !dialog.open) return;
      if (current < scenes.length - 1) go(current + 1);
      else { playing = false; syncPlayButton(); document.getElementById('tutorialProgressBar').style.width = '100%'; }
    }, STEP_MS);
  }

  function syncPlayButton() {
    const btn = document.getElementById('tutorialPlayBtn');
    if (btn) btn.textContent = playing ? '❚❚ Pause' : '▶ Play';
  }

  function togglePlay() {
    playing = !playing;
    syncPlayButton();
    if (playing) restartTimer();
    else { clearInterval(tick); clearTimeout(timer); }
  }

  function openTour({ autoplay = true } = {}) {
    if (!dialog) buildDialog();
    current = 0;
    playing = autoplay;
    syncPlayButton();
    renderScene();
    if (!dialog.open) dialog.showModal();
    if (playing) restartTimer();
  }

  function closeTour() {
    clearInterval(tick);
    clearTimeout(timer);
    try { localStorage.setItem(TOUR_KEY, '1'); } catch (_) {}
    if (dialog && dialog.open) dialog.close();
  }

  function init() {
    buildDialog();
    const openBtn = document.getElementById('openTutorialBtn');
    if (openBtn) openBtn.addEventListener('click', () => openTour({ autoplay: true }));
    const mobileBtn = document.getElementById('mobileTutorialBtn');
    if (mobileBtn) mobileBtn.addEventListener('click', () => openTour({ autoplay: true }));

    let seen = false;
    try { seen = localStorage.getItem(TOUR_KEY) === '1'; } catch (_) {}
    if (!seen) setTimeout(() => openTour({ autoplay: true }), 1400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
