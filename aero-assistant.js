// ══════════════════════════════════════════════════════════════════
//  aero-assistant.js — Aeromatrics AI Assistant v2
//  Powered by Google Gemini 2.5 Flash + Google Search Grounding
//  Live AQI · Health Precautions · Forecasts · Sensor Analysis
//  ⚠  Requires CONFIG.GEMINI_KEY in config.js
// ══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── CSS ─────────────────────────────────────────────────────────
  const CSS = `
    #aeroAssistFab {
      position: fixed; bottom: 28px; right: 28px; z-index: 10000;
      width: 56px; height: 56px;
      background: var(--bg2);
      border: 1.5px solid var(--teal);
      color: var(--teal);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 28px rgba(0,229,204,0.25), 0 4px 24px rgba(0,0,0,0.5);
      transition: box-shadow 0.25s, background 0.2s, transform 0.18s;
      animation: assistPulse 3s ease-in-out infinite;
    }
    #aeroAssistFab:hover {
      background: rgba(0,229,204,0.1);
      box-shadow: 0 0 40px rgba(0,229,204,0.5), 0 4px 30px rgba(0,0,0,0.6);
      transform: scale(1.08);
    }
    #aeroAssistFab.open {
      background: rgba(0,229,204,0.12); animation: none;
      box-shadow: 0 0 40px rgba(0,229,204,0.4);
    }
    @keyframes assistPulse {
      0%,100% { box-shadow: 0 0 18px rgba(0,229,204,0.2), 0 4px 20px rgba(0,0,0,0.4); }
      50%      { box-shadow: 0 0 36px rgba(0,229,204,0.5), 0 4px 28px rgba(0,0,0,0.5); }
    }
    #aeroAssistFab .fab-badge {
      position: absolute; top: -5px; right: -5px;
      width: 18px; height: 18px;
      background: var(--danger); border-radius: 50%;
      font-size: 0.56rem; color: #fff; font-family: var(--mono);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; border: 2px solid var(--bg);
    }
    #aeroAssistFab .fab-tooltip {
      position: absolute; right: 66px; top: 50%; transform: translateY(-50%);
      background: var(--bg2); border: 1px solid var(--teal);
      color: var(--teal); font-family: var(--mono); font-size: 0.6rem;
      padding: 0.3rem 0.7rem; white-space: nowrap; letter-spacing: 0.1em;
      pointer-events: none; opacity: 0; transition: opacity 0.2s;
    }
    #aeroAssistFab:hover .fab-tooltip { opacity: 1; }

    #aeroAssistPanel {
      position: fixed; bottom: 96px; right: 28px; z-index: 10000;
      width: 400px; max-height: 630px;
      background: var(--panel);
      border: 1px solid var(--teal);
      box-shadow: 0 0 50px rgba(0,229,204,0.15), 0 12px 60px rgba(0,0,0,0.8);
      display: flex; flex-direction: column;
      transform: scale(0.9) translateY(20px);
      opacity: 0; pointer-events: none;
      transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.22s;
      overflow: hidden;
    }
    #aeroAssistPanel.visible {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }
    @media (max-width: 480px) {
      #aeroAssistPanel { right: 8px; left: 8px; width: auto; bottom: 86px; }
      #aeroAssistFab   { right: 16px; bottom: 18px; }
    }

    .assist-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.8rem 1rem;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, var(--bg2) 0%, rgba(0,229,204,0.04) 100%);
      flex-shrink: 0;
    }
    .assist-header-left { display: flex; align-items: center; gap: 0.7rem; }
    .assist-icon-wrap {
      width: 34px; height: 34px;
      border: 1px solid rgba(0,229,204,0.4);
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,229,204,0.06); flex-shrink: 0;
      color: var(--teal);
    }
    .assist-title {
      font-family: var(--mono); font-size: 0.7rem;
      letter-spacing: 0.18em; color: var(--teal); font-weight: 700;
    }
    .assist-subtitle {
      font-family: var(--mono); font-size: 0.54rem;
      color: var(--text2); letter-spacing: 0.08em; margin-top: 0.1rem;
    }
    .assist-header-right { display: flex; align-items: center; gap: 0.5rem; }
    .assist-search-badge {
      font-family: var(--mono); font-size: 0.5rem; letter-spacing: 0.08em;
      padding: 0.15rem 0.5rem;
      border: 1px solid rgba(0,170,255,0.4); color: var(--blue);
      background: rgba(0,170,255,0.05);
    }
    .assist-close-btn {
      background: none; border: 1px solid var(--border);
      color: var(--text2); width: 26px; height: 26px;
      cursor: pointer; font-size: 0.9rem;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .assist-close-btn:hover { border-color: var(--danger); color: var(--danger); }

    .assist-context-bar {
      display: flex; gap: 0.35rem; padding: 0.4rem 0.8rem;
      background: rgba(0,229,204,0.02);
      border-bottom: 1px solid var(--border);
      overflow-x: auto; flex-shrink: 0;
    }
    .assist-context-bar::-webkit-scrollbar { display: none; }
    .ctx-chip {
      font-family: var(--mono); font-size: 0.54rem; letter-spacing: 0.08em;
      padding: 0.16rem 0.5rem; border: 1px solid var(--border);
      color: var(--text2); white-space: nowrap;
      background: var(--bg2); flex-shrink: 0;
    }
    .ctx-chip.live   { border-color: rgba(0,229,204,0.4); color: var(--teal); }
    .ctx-chip.warn   { border-color: rgba(255,170,0,0.45); color: var(--warn); }
    .ctx-chip.danger { border-color: rgba(255,51,68,0.5);  color: var(--danger); }
    .ctx-chip.search { border-color: rgba(0,170,255,0.35); color: var(--blue); }

    .assist-quick-label {
      font-family: var(--mono); font-size: 0.52rem; letter-spacing: 0.12em;
      color: var(--text2); padding: 0.45rem 0.9rem 0.2rem; flex-shrink: 0;
    }
    .assist-quick-wrap {
      display: flex; gap: 0.35rem; padding: 0 0.8rem 0.5rem;
      flex-wrap: wrap; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .quick-btn {
      font-family: var(--mono); font-size: 0.56rem; letter-spacing: 0.05em;
      padding: 0.22rem 0.6rem; border: 1px solid var(--border);
      color: var(--text2); background: transparent; cursor: pointer; transition: all 0.15s;
    }
    .quick-btn:hover { border-color: var(--teal); color: var(--teal); background: rgba(0,229,204,0.05); }
    .quick-btn.sq { border-color: rgba(0,170,255,0.22); }
    .quick-btn.sq:hover { border-color: var(--blue); color: var(--blue); background: rgba(0,170,255,0.05); }

    .assist-messages {
      flex: 1; overflow-y: auto; padding: 0.8rem 0.9rem;
      display: flex; flex-direction: column; gap: 0.7rem; min-height: 0;
    }
    .assist-messages::-webkit-scrollbar { width: 3px; }
    .assist-messages::-webkit-scrollbar-track { background: var(--bg2); }
    .assist-messages::-webkit-scrollbar-thumb { background: rgba(0,229,204,0.25); }

    .msg { display: flex; flex-direction: column; gap: 0.2rem; animation: msgIn 0.2s ease; }
    @keyframes msgIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
    .msg-role { font-family: var(--mono); font-size: 0.5rem; letter-spacing: 0.16em; color: var(--text2); }
    .msg.user .msg-role { color: rgba(0,170,255,0.55); text-align: right; }
    .msg.user { align-items: flex-end; }

    .msg-bubble {
      font-family: var(--display); font-size: 0.79rem;
      line-height: 1.62; padding: 0.6rem 0.85rem;
      border: 1px solid; max-width: 93%;
    }
    .msg.assistant .msg-bubble {
      border-color: var(--border); background: rgba(255,255,255,0.02);
      color: var(--text); border-left: 2px solid var(--teal);
    }
    .msg.user .msg-bubble {
      border-color: rgba(0,170,255,0.3); background: rgba(0,170,255,0.05);
      color: var(--text); text-align: right;
    }
    .msg-bubble strong, .msg-bubble b { color: var(--teal); font-weight: 600; }
    .msg-bubble em { color: var(--warn); font-style: normal; font-weight: 500; }
    .msg-bubble code {
      font-family: var(--mono); font-size: 0.72rem;
      background: rgba(0,229,204,0.07); padding: 0.1rem 0.3rem; color: var(--teal2);
    }
    .msg-bubble ul, .msg-bubble ol { padding-left: 1.1rem; margin: 0.3rem 0; }
    .msg-bubble li { margin-bottom: 0.25rem; }
    .msg-bubble h3 {
      font-size: 0.8rem; color: var(--teal); letter-spacing: 0.1em;
      margin: 0.5rem 0 0.25rem; font-family: var(--mono);
    }
    .msg-bubble hr { border: none; border-top: 1px solid var(--border); margin: 0.5rem 0; }

    .msg-sources {
      margin-top: 0.5rem; padding-top: 0.4rem;
      border-top: 1px solid var(--border);
    }
    .msg-sources-label {
      font-family: var(--mono); font-size: 0.5rem;
      letter-spacing: 0.12em; color: var(--text2); margin-bottom: 0.3rem;
    }
    .msg-source-chip {
      display: inline-block; font-family: var(--mono); font-size: 0.52rem;
      padding: 0.12rem 0.45rem; margin: 0.1rem 0.12rem 0 0;
      border: 1px solid rgba(0,170,255,0.25); color: var(--blue);
      background: rgba(0,170,255,0.04); text-decoration: none; transition: all 0.15s;
    }
    .msg-source-chip:hover { border-color: var(--blue); background: rgba(0,170,255,0.1); }

    .msg-search-info {
      font-family: var(--mono); font-size: 0.49rem; color: var(--blue);
      letter-spacing: 0.06em; opacity: 0.65; margin-bottom: 0.15rem;
    }

    .typing-bubble {
      display: flex; align-items: center; gap: 5px; padding: 0.6rem 0.9rem;
      border: 1px solid var(--border); border-left: 2px solid var(--teal);
      background: rgba(255,255,255,0.02); width: fit-content;
    }
    .typing-dot {
      width: 5px; height: 5px; border-radius: 50%; background: var(--teal);
      animation: typingBounce 1.1s infinite ease-in-out;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.18s; }
    .typing-dot:nth-child(3) { animation-delay: 0.36s; }
    @keyframes typingBounce {
      0%,80%,100% { transform:scale(0.6); opacity:0.4; }
      40%          { transform:scale(1); opacity:1; }
    }
    .typing-search-label {
      font-family: var(--mono); font-size: 0.52rem; color: var(--blue);
      letter-spacing: 0.06em; margin-left: 0.3rem;
    }

    .assist-input-row {
      display: flex; align-items: center;
      border-top: 1px solid var(--border); flex-shrink: 0; background: var(--bg2);
    }
    #assistInput {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--text); font-family: var(--mono); font-size: 0.72rem;
      padding: 0.75rem 0.9rem; letter-spacing: 0.04em;
    }
    #assistInput::placeholder { color: var(--text2); opacity: 0.5; }
    #assistSendBtn {
      background: transparent; border: none;
      border-left: 1px solid var(--border); color: var(--teal);
      cursor: pointer; width: 46px; height: 46px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s; flex-shrink: 0;
    }
    #assistSendBtn:hover  { background: rgba(0,229,204,0.09); }
    #assistSendBtn:disabled { color: var(--text2); cursor: not-allowed; }

    .assist-footer {
      padding: 0.28rem 0.9rem; font-family: var(--mono); font-size: 0.5rem;
      color: var(--text2); border-top: 1px solid var(--border);
      letter-spacing: 0.06em; background: var(--bg);
      display: flex; align-items: center; justify-content: space-between;
    }
    .assist-footer-model { color: rgba(0,229,204,0.4); }
    .assist-clear-btn {
      background: none; border: none; color: var(--text2); cursor: pointer;
      font-family: var(--mono); font-size: 0.5rem;
      letter-spacing: 0.06em; transition: color 0.15s;
    }
    .assist-clear-btn:hover { color: var(--danger); }

    @keyframes breathe { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:0.7} }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.75s linear infinite; }
  `;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // ── QUICK PROMPTS ─────────────────────────────────────────────────
  const QUICK = [
    { label: '🌆 Delhi AQI now',       q: 'What is the current AQI of Delhi right now? Is it safe to go outside?',                     sq: true  },
    { label: '🏥 Health precautions',  q: 'Based on current air quality in my area, what health precautions should I follow today?',    sq: true  },
    { label: '📊 Sensor analysis',     q: 'Analyze my live sensor readings — temperature, humidity, and gas levels. Any anomalies or concerns?', sq: false },
    { label: '🏙️ Worst cities today',  q: 'Which Indian cities have the worst AQI right now? List top 5 most polluted.',                sq: true  },
    { label: '🔮 Pollution forecast',  q: 'What is the air quality forecast for North India in the next 24–48 hours?',                 sq: true  },
    { label: '😷 Best mask advice',    q: 'What type of mask should I use for high AQI — N95, KN95, or surgical? When is each needed?', sq: false },
    { label: '⚠️ Alert explanation',   q: 'Explain my current sensor alerts and what immediate action I should take.',                  sq: false },
    { label: '🌫️ PM2.5 health guide',  q: 'Explain PM2.5 levels, their health effects, and at what levels should I stay indoors?',     sq: false },
  ];

  // ── BUILD HTML ────────────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.id = 'aeroAssistFab';
  fab.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <line x1="9" y1="10" x2="15" y2="10" stroke-width="1.5"/>
      <line x1="9" y1="13" x2="13" y2="13" stroke-width="1.5"/>
    </svg>
    <span class="fab-badge" id="assistBadge" style="display:none">●</span>
    <span class="fab-tooltip">AEROASSIST AI</span>
  `;

  const panel = document.createElement('div');
  panel.id = 'aeroAssistPanel';
  panel.innerHTML = `
    <div class="assist-header">
      <div class="assist-header-left">
        <div class="assist-icon-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div>
          <div class="assist-title">// AEROASSIST</div>
          <div class="assist-subtitle">Air Quality Intelligence · Live Web Search</div>
        </div>
      </div>
      <div class="assist-header-right">
        <span class="assist-search-badge">🔍 SEARCH ON</span>
        <button class="assist-close-btn" id="assistCloseBtn">✕</button>
      </div>
    </div>

    <div class="assist-context-bar" id="assistContextBar">
      <span class="ctx-chip">Loading context…</span>
    </div>

    <div class="assist-quick-label">QUICK QUERIES</div>
    <div class="assist-quick-wrap">
      ${QUICK.map(q => `<button class="quick-btn${q.sq?' sq':''}" data-q="${q.q}">${q.label}</button>`).join('')}
    </div>

    <div class="assist-messages" id="assistMessages">
      <div class="msg assistant">
        <div class="msg-role">AEROASSIST · ONLINE</div>
        <div class="msg-bubble">
          Hello! I'm <strong>AeroAssist</strong> — your full-power AI for air quality.<br><br>
          I can read your <strong>live sensor data</strong> and search the web in real time for:<br>
          <ul>
            <li>Current AQI of any city (Delhi, Mumbai, etc.)</li>
            <li>Health precautions based on today's pollution</li>
            <li>48-hour pollution forecasts</li>
            <li>Sensor anomaly analysis</li>
            <li>Mask & purifier recommendations</li>
          </ul>
          Try: <em>"What is Delhi's AQI right now?"</em>
        </div>
      </div>
    </div>

    <div class="assist-input-row">
      <input id="assistInput" type="text"
        placeholder="Ask AQI, precautions, forecasts, health…" maxlength="600"/>
      <button id="assistSendBtn" title="Send (Enter)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>

    <div class="assist-footer">
      <button class="assist-clear-btn" id="assistClearBtn">CLEAR CHAT</button>
      <span class="assist-footer-model">gemini-2.5-flash · google search grounded</span>
    </div>
  `;

  // ── MOUNT ────────────────────────────────────────────────────────
  function mount() {
    const shell = document.body;
    shell.appendChild(fab);
    shell.appendChild(panel);
    bindEvents();
    updateContextBar();
    setInterval(updateContextBar, 12000);
  }

  // ── STATE ────────────────────────────────────────────────────────
  let isOpen   = false;
  let isTyping = false;
  const history = [];

  // ── TOGGLE ───────────────────────────────────────────────────────
  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('visible', isOpen);
    fab.classList.toggle('open', isOpen);
    document.getElementById('assistBadge').style.display = 'none';
    if (isOpen) {
      setTimeout(() => document.getElementById('assistInput').focus(), 240);
      scrollToBottom();
    }
  }

  // ── LIVE CONTEXT ─────────────────────────────────────────────────
  function getLiveContext() {
    const get = id => { const el = document.getElementById(id); return el ? el.textContent.trim() : '—'; };
    return {
      temp:      get('statTemp'),
      hum:       get('statHum'),
      gas:       get('statGas'),
      alerts:    get('statAlerts'),
      gValTemp:  get('gValTemp'),
      gValHum:   get('gValHum'),
      gValGas:   get('gValGas'),
      tagTemp:   get('tagTemp'),
      tagHum:    get('tagHum'),
      tagGas:    get('tagGas'),
      statusTxt: get('statusText'),
      clock:     get('clock'),
      locName:   get('currentLocName') || get('aqiLocName') || 'not selected',
      aqiVal:    get('aqiValue') || get('currentAQI') || get('aqiNum') || '—',
      logItems:  [...document.querySelectorAll('.log-entry .log-msg')]
                   .slice(-6).map(el => el.textContent.trim()).filter(Boolean),
    };
  }

  // ── SYSTEM PROMPT ────────────────────────────────────────────────
  function buildSystemPrompt(ctx) {
    const today = new Date().toLocaleDateString('en-IN',
      { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    return `You are AeroAssist, the expert AI embedded in Aeromatrics — a real-time India Air Quality Monitor and IoT sensor dashboard. You are a world-class authority on air quality, pollution, and environmental health.

TODAY: ${today} | TIME: ${ctx.clock} IST

LIVE IOT SENSOR READINGS (NodeMCU ESP8266 · DHT11 + MQ135):
- Temperature : ${ctx.temp}°C  [${ctx.tagTemp}]
- Humidity    : ${ctx.hum}%   [${ctx.tagHum}]
- Gas / VOC   : ${ctx.gas} ppm [${ctx.tagGas}]
- Active Alerts : ${ctx.alerts}
- Dashboard AQI : ${ctx.aqiVal}
- Location      : ${ctx.locName}
- System Status : ${ctx.statusTxt}
${ctx.logItems.length ? '\nRECENT ALERTS:\n' + ctx.logItems.map(l=>'• '+l).join('\n') : ''}

THRESHOLDS:
- Gas: SAFE <300 | WARNING 300-400 | DANGER >400 ppm
- Temp: WARNING >35°C | DANGER >40°C
- AQI: Good 0-50 | Moderate 51-100 | Unhealthy Sensitive 101-150 | Unhealthy 151-200 | Very Unhealthy 201-300 | Hazardous >300

YOU HAVE GOOGLE SEARCH — use it proactively to fetch:
• Real-time AQI for any Indian/world city
• Current health advisories and forecasts
• Latest pollution news

RESPONSE FORMAT RULES:
1. For city AQI queries → search first, give exact current AQI value + category + safe/unsafe verdict
2. For health precautions → bullet list: General public → Sensitive groups (elderly/children/asthmatic) → Outdoor activity → Protective gear
3. For sensor analysis → reference exact live numbers above, flag dangerous readings immediately
4. For forecasts → give 24h and 48h outlook with actionable advice
5. Use **bold** for AQI numbers, danger levels, and key recommendations
6. Keep replies focused. Use headers (###) for multi-section answers
7. Always add an India-specific context (CPCB standards, seasonal patterns, local factors)
8. If a sensor reading is DANGEROUS, lead with an urgent warning`;
  }

  // ── CONTEXT BAR ──────────────────────────────────────────────────
  function updateContextBar() {
    const ctx = getLiveContext();
    const bar = document.getElementById('assistContextBar');
    if (!bar) return;
    const gasN = parseFloat(ctx.gas)  || 0;
    const tmpN = parseFloat(ctx.temp) || 0;
    bar.innerHTML = `
      <span class="ctx-chip live">● LIVE</span>
      <span class="ctx-chip ${tmpN>40?'danger':tmpN>35?'warn':'live'}">🌡 ${ctx.temp}°C</span>
      <span class="ctx-chip">💧 ${ctx.hum}%</span>
      <span class="ctx-chip ${gasN>400?'danger':gasN>300?'warn':'live'}">⬡ ${ctx.gas} ppm</span>
      <span class="ctx-chip ${ctx.alerts!=='0'?'warn':''}">⚠ ${ctx.alerts} alerts</span>
      <span class="ctx-chip search">🔍 Web Search ON</span>
    `;
  }

  // ── SEND MESSAGE ─────────────────────────────────────────────────
  async function sendMessage(text) {
    text = text.trim();
    if (!text || isTyping) return;

    const key = (typeof CONFIG !== 'undefined' && CONFIG.GEMINI_KEY) ? CONFIG.GEMINI_KEY : null;
    if (!key || key === 'YOUR_GEMINI_API_KEY_HERE') {
      appendMsg('assistant', '⚠ **AeroAssist not configured.** Add your Gemini API key to `CONFIG.GEMINI_KEY` in `config.js`.\n\nGet a free key at: https://aistudio.google.com/app/apikey');
      return;
    }

    appendMsg('user', text);
    history.push({ role: 'user', parts: [{ text }] });

    const typingEl = showTyping();
    isTyping = true;
    document.getElementById('assistSendBtn').disabled = true;

    try {
      const ctx  = getLiveContext();
      const body = {
        system_instruction: { parts: [{ text: buildSystemPrompt(ctx) }] },
        contents: history.map(m => ({ role: m.role, parts: m.parts })),
        generationConfig: { temperature: 0.6, maxOutputTokens: 900, topP: 0.92 },
        tools: [{ googleSearch: {} }],
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const data      = await res.json();
      const candidate = data.candidates?.[0];
      const parts     = candidate?.content?.parts || [];
      const replyText = parts.filter(p => p.text).map(p => p.text).join('') || 'No response received.';

      // Extract grounding metadata
      const meta    = candidate?.groundingMetadata || {};
      const queries = meta.webSearchQueries || [];
      const sources = (meta.groundingChunks || [])
        .map(c => c.web).filter(Boolean)
        .filter((w, i, a) => a.findIndex(x => x.uri === w.uri) === i)
        .slice(0, 5);

      typingEl.remove();
      appendMsg('assistant', replyText, sources, queries);
      history.push({ role: 'model', parts: [{ text: replyText }] });
      while (history.length > 20) history.splice(0, 2);

    } catch (e) {
      typingEl.remove();
      appendMsg('assistant', `⚠ **Error:** ${e.message}\n\nCheck your Gemini API key and internet connection.`);
      console.error('[AeroAssist]', e);
    } finally {
      isTyping = false;
      document.getElementById('assistSendBtn').disabled = false;
    }
  }

  // ── DOM HELPERS ───────────────────────────────────────────────────
  function appendMsg(role, text, sources = [], queries = []) {
    const box = document.getElementById('assistMessages');
    const div = document.createElement('div');
    div.className = `msg ${role}`;

    const queryLine = (queries.length && role === 'assistant')
      ? `<div class="msg-search-info">🔍 Searched: ${queries.map(q=>`"${q}"`).join(' · ')}</div>`
      : '';

    const srcHTML = sources.length
      ? `<div class="msg-sources">
           <div class="msg-sources-label">LIVE SOURCES</div>
           ${sources.map(s => {
               let host = s.uri;
               try { host = new URL(s.uri).hostname.replace('www.',''); } catch(e){}
               return `<a class="msg-source-chip" href="${s.uri}" target="_blank" rel="noopener">${s.title || host}</a>`;
             }).join('')}
         </div>`
      : '';

    div.innerHTML = `
      <div class="msg-role">${role === 'user' ? 'YOU' : 'AEROASSIST'}</div>
      ${queryLine}
      <div class="msg-bubble">${renderMarkdown(text)}${srcHTML}</div>
    `;
    box.appendChild(div);
    scrollToBottom();
    if (!isOpen && role === 'assistant') {
      document.getElementById('assistBadge').style.display = 'flex';
    }
  }

  function showTyping() {
    const box = document.getElementById('assistMessages');
    const div = document.createElement('div');
    div.className = 'msg assistant';
    div.innerHTML = `
      <div class="msg-role">AEROASSIST · SEARCHING WEB…</div>
      <div class="typing-bubble">
        <svg class="spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5">
          <path d="M21 12a9 9 0 1 1-9-9"/>
        </svg>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <span class="typing-search-label">fetching live data</span>
      </div>
    `;
    box.appendChild(div);
    scrollToBottom();
    return div;
  }

  function scrollToBottom() {
    const box = document.getElementById('assistMessages');
    if (box) requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  }

  function renderMarkdown(t) {
    return t
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/^### (.+)$/gm,    '<h3>$1</h3>')
      .replace(/^## (.+)$/gm,     '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g,  '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,      '<em>$1</em>')
      .replace(/`(.+?)`/g,        '<code>$1</code>')
      .replace(/^---$/gm,         '<hr>')
      .replace(/^\d+\.\s+(.+)$/gm,'<li>$1</li>')
      .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/<\/ul>\s*<ul>/g,  '')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  // ── EVENTS ───────────────────────────────────────────────────────
  function bindEvents() {
    fab.addEventListener('click', togglePanel);
    document.getElementById('assistCloseBtn').addEventListener('click', togglePanel);

    const input = document.getElementById('assistInput');
    const send  = document.getElementById('assistSendBtn');
    const doSend = () => { const v = input.value; input.value = ''; sendMessage(v); };

    send.addEventListener('click', doSend);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    panel.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => sendMessage(btn.dataset.q));
    });

    document.getElementById('assistClearBtn').addEventListener('click', () => {
      history.length = 0;
      document.getElementById('assistMessages').innerHTML = `
        <div class="msg assistant">
          <div class="msg-role">AEROASSIST</div>
          <div class="msg-bubble">Chat cleared. Ask me anything about air quality, your sensors, or health.</div>
        </div>`;
    });

    document.addEventListener('click', e => {
      if (isOpen && !panel.contains(e.target) && !fab.contains(e.target)) togglePanel();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) togglePanel();
    });
  }

  // ── INIT ─────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.AeroAssist = { toggle: togglePanel, sendMessage };
  console.log('[Aeromatrics] AeroAssist v2 — Gemini 2.5 Flash + Google Search Grounding');

})();