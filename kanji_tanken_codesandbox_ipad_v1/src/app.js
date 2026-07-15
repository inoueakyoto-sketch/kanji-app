(() => {
  'use strict';

  const DATA = window.KANJI_TANKEN_DATA;
  const CHARS = DATA.characters;
  const CHAR_MAP = Object.fromEntries(CHARS.map(c => [c.id, c]));
  const KANJI_MAP = Object.fromEntries(CHARS.map(c => [c.kanji, c]));
  const STORAGE_KEY = 'kanjiTankenPhase2Prototype20.v1';

  const GAMES = {
    stroke: { id: 'stroke', icon: '🔎', title: 'せんをみつけよう', skill: '一画へ注意を向ける', strategy: 'stroke' },
    part: { id: 'part', icon: '🧩', title: 'ぶひんハンター', skill: '全体の中からまとまりを見つける', strategy: 'parts' },
    difference: { id: 'difference', icon: '👀', title: 'どこがちがう？', skill: '長さ・位置・向きを比べる', strategy: 'compare' },
    missing: { id: 'missing', icon: '⭐', title: 'あといっぽん', skill: '見た形を思い出して選ぶ', strategy: 'slow' },
    order: { id: 'order', icon: '1️⃣', title: 'じゅんばんたんけん', skill: '一画ずつ順番を確かめる', strategy: 'stroke' }
  };

  const STRATEGIES = [
    { id: 'slow', icon: '👀', label: 'ゆっくり見る' },
    { id: 'parts', icon: '🧩', label: '部品に分ける' },
    { id: 'compare', icon: '🔍', label: '違いを探す' },
    { id: 'stroke', icon: '1️⃣', label: '一画ずつ見る' },
    { id: 'write', icon: '✏️', label: '書いてみる' },
    { id: 'hint', icon: '💡', label: 'ヒントを見る' },
    { id: 'none', icon: '○', label: '今日は選ばない' }
  ];
  const WRITING = [
    { id: 'look', label: '見るだけにした' },
    { id: 'air', label: '指で空書きした' },
    { id: 'paper', label: '紙に書いてみた' },
    { id: 'skip', label: '今日は書かない' }
  ];

  const $ = id => document.getElementById(id);
  const refs = {
    pages: {
      home: $('homePage'), game: $('gamePage'), reflection: $('reflectionPage'), notebook: $('notebookPage'), adult: $('adultPage')
    },
    nav: [...document.querySelectorAll('.nav-btn[data-page]')],
    zones: $('zones'), todayKanji: $('todayKanji'), todayTitle: $('todayTitle'), todayMeta: $('todayMeta'),
    todayProgress: $('todayProgress'), todayProgressText: $('todayProgressText'), mapSummary: $('mapSummary'),
    startRecommended: $('startRecommended'), openPicker: $('openPicker'),
    backHome: $('backHomeBtn'), pause: $('pauseBtn'), missionTrack: $('missionTrack'),
    gameIcon: $('gameIcon'), gameTitle: $('gameTitle'), gameSkill: $('gameSkill'), gameKanji: $('gameKanji'), gameBody: $('gameBody'),
    hint: $('hintBtn'), showWhole: $('showWholeBtn'), continueBtn: $('continueBtn'),
    strategyGrid: $('strategyGrid'), writingGrid: $('writingGrid'), saveReflection: $('saveReflectionBtn'),
    rewardReveal: $('rewardReveal'), rewardKanji: $('rewardKanji'), rewardTitle: $('rewardTitle'), rewardText: $('rewardText'), rewardHome: $('rewardHomeBtn'),
    bookGrid: $('bookGrid'), titleBadge: $('titleBadge'), skillBars: $('skillBars'), methodList: $('methodList'),
    reportRange: $('reportRange'), reportCards: $('reportCards'), adultInsights: $('adultInsights'), adultTableBody: $('adultTableBody'), adultMethods: $('adultMethods'), supportTip: $('supportTip'), exportBtn: $('exportBtn'), resetBtn: $('resetBtn'),
    settingsModal: $('settingsModal'), settingsBtn: $('settingsBtn'), closeSettings: $('closeSettings'), lowStim: $('lowStim'), reduceMotion: $('reduceMotion'), ghostGuide: $('ghostGuide'), missionCount: $('missionCount'), choiceCount: $('choiceCount'),
    pauseModal: $('pauseModal'), resume: $('resumeBtn'), finishEarly: $('finishEarlyBtn'),
    pickerModal: $('pickerModal'), gamePicker: $('gamePicker'), cancelPicker: $('cancelPicker'), startPicked: $('startPicked')
  };

  const defaultStore = () => ({
    version: 1,
    settings: { lowStim: false, reduceMotion: false, ghostGuide: true, missionCount: 3, choiceCount: 3 },
    ui: { lastCharId: CHARS[0].id },
    records: {},
    sessions: []
  });

  function loadStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!raw || raw.version !== 1) return defaultStore();
      return {
        ...defaultStore(), ...raw,
        settings: { ...defaultStore().settings, ...(raw.settings || {}) },
        ui: { ...defaultStore().ui, ...(raw.ui || {}) },
        records: raw.records || {}, sessions: Array.isArray(raw.sessions) ? raw.sessions : []
      };
    } catch (_) { return defaultStore(); }
  }

  let store = loadStore();
  let state = {
    page: 'home', selectedId: CHAR_MAP[store.ui.lastCharId] ? store.ui.lastCharId : CHARS[0].id,
    session: null, game: null, continueAction: null, pickedGame: null,
    reflectionStrategies: new Set(), writingChoice: null
  };

  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      console.error('学習記録を保存できませんでした。', error);
      window.dispatchEvent(new CustomEvent('kanji-storage-error'));
    }
  }
  function currentChar() { return CHAR_MAP[state.selectedId]; }
  function getRecord(id) {
    if (!store.records[id]) store.records[id] = { visits: 0, games: {}, card: false, reflections: {}, writing: {}, lastPlayed: null };
    return store.records[id];
  }
  function getGameRecord(id, type) {
    const r = getRecord(id);
    if (!r.games[type]) r.games[type] = { played: 0, completed: 0, attempts: 0, hints: 0, retries: 0 };
    return r.games[type];
  }
  function completedGameTypes(id) {
    const r = getRecord(id);
    return Object.entries(r.games).filter(([, v]) => v.completed > 0).map(([k]) => k);
  }
  function isDiscovered(id) { return getRecord(id).card || completedGameTypes(id).length >= 3; }

  function showPage(page) {
    state.page = page;
    Object.entries(refs.pages).forEach(([k, el]) => el.classList.toggle('active', k === page));
    refs.nav.forEach(b => b.classList.toggle('active', b.dataset.page === page));
    if (page === 'home') renderHome();
    if (page === 'notebook') renderNotebook();
    if (page === 'adult') renderAdult();
    window.scrollTo({ top: 0, behavior: store.settings.reduceMotion ? 'auto' : 'smooth' });
  }

  function applySettings() {
    document.body.classList.toggle('low-stim', store.settings.lowStim);
    document.body.classList.toggle('reduce-motion', store.settings.reduceMotion);
    refs.lowStim.checked = store.settings.lowStim;
    refs.reduceMotion.checked = store.settings.reduceMotion;
    refs.ghostGuide.checked = store.settings.ghostGuide;
    refs.missionCount.value = String(store.settings.missionCount);
    refs.choiceCount.value = String(store.settings.choiceCount);
  }

  function renderHome() {
    const ch = currentChar();
    const done = completedGameTypes(ch.id).length;
    refs.todayKanji.textContent = ch.kanji;
    refs.todayTitle.textContent = `「${ch.kanji}」を見てみよう`;
    refs.todayMeta.textContent = `${ch.reading}・${ch.strokeCount}画`;
    refs.todayProgress.style.width = `${done / 5 * 100}%`;
    refs.todayProgressText.textContent = `${done} / 5 のひみつを発見`;
    const cards = CHARS.filter(c => isDiscovered(c.id)).length;
    refs.mapSummary.textContent = `発見カード ${cards} / ${CHARS.length}`;

    refs.zones.innerHTML = '';
    DATA.zones.forEach(zone => {
      const section = document.createElement('section');
      section.className = 'zone';
      section.innerHTML = `<div class="zone-head"><div class="zone-icon">${zone.icon}</div><div><h3>${zone.title}</h3><p>${zone.subtitle}</p></div></div><div class="kanji-grid"></div>`;
      const grid = section.querySelector('.kanji-grid');
      zone.kanji.forEach(k => {
        const c = KANJI_MAP[k];
        const gameDone = completedGameTypes(c.id).length;
        const btn = document.createElement('button');
        btn.className = `kanji-tile ${c.id === state.selectedId ? 'selected' : ''} ${isDiscovered(c.id) ? 'discovered' : ''}`;
        btn.setAttribute('aria-label', `${c.kanji} ${c.reading}`);
        btn.innerHTML = `${c.kanji}<span class="dots">${[0,1,2,3,4].map(i => `<i class="dot ${i < gameDone ? 'on' : ''}"></i>`).join('')}</span>`;
        btn.addEventListener('click', () => {
          state.selectedId = c.id;
          store.ui.lastCharId = c.id;
          saveStore();
          renderHome();
        });
        grid.appendChild(btn);
      });
      refs.zones.appendChild(section);
    });
  }

  function supportedGames(ch) {
    const list = ['stroke'];
    if (ch.groups.length >= 2) list.push('part');
    list.push('difference');
    if (ch.strokeCount >= 2) list.push('missing');
    list.push('order');
    return list;
  }

  function buildRecommendedQueue(ch, count) {
    const supported = supportedGames(ch);
    if (count >= 5) return ['stroke', 'part', 'difference', 'missing', 'order'].filter(g => supported.includes(g));
    if (count === 2) return ['stroke', 'order'];
    const middle = supported.includes('part') ? (Math.random() < .5 ? 'part' : 'difference') : 'difference';
    return ['stroke', middle, 'order'];
  }

  function startSession(queue) {
    const ch = currentChar();
    const record = getRecord(ch.id);
    record.visits += 1;
    record.lastPlayed = new Date().toISOString();
    saveStore();
    state.session = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      charId: ch.id, queue, index: -1, startedAt: Date.now(), results: [], early: false
    };
    state.game = null;
    state.reflectionStrategies = new Set();
    state.writingChoice = null;
    showPage('game');
    renderIntro();
  }

  function renderTrack() {
    if (!state.session) { refs.missionTrack.innerHTML = ''; return; }
    refs.missionTrack.innerHTML = state.session.queue.map((_, i) => {
      const cls = i < state.session.index ? 'done' : i === state.session.index ? 'now' : '';
      return `<span class="mission-node ${cls}"></span>`;
    }).join('');
  }

  function setHeader(icon, title, skill) {
    const ch = currentChar();
    refs.gameIcon.textContent = icon;
    refs.gameTitle.textContent = title;
    refs.gameSkill.textContent = skill;
    refs.gameKanji.textContent = ch.kanji;
  }
  function setFeedback(text, type = '') {
    const el = refs.gameBody.querySelector('.feedback');
    if (el) { el.className = `feedback ${type}`; el.innerHTML = text; }
  }
  function setActions({ hint = true, whole = true, continueVisible = false, continueText = 'つぎへ', action = null } = {}) {
    refs.hint.classList.toggle('hidden', !hint);
    refs.showWhole.classList.toggle('hidden', !whole);
    refs.continueBtn.classList.toggle('hidden', !continueVisible);
    refs.continueBtn.textContent = continueText;
    state.continueAction = action;
  }

  function makeSvg(ch, aria = '') {
    const tpl = document.createElement('template');
    tpl.innerHTML = ch.svg.trim();
    const svg = tpl.content.firstElementChild;
    svg.removeAttribute('width'); svg.removeAttribute('height');
    if (aria) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', aria); }
    [...svg.querySelectorAll('.stroke')].forEach(p => {
      p.style.fill = 'none'; p.style.stroke = '#26333a'; p.style.strokeWidth = '6';
      p.style.strokeLinecap = 'round'; p.style.strokeLinejoin = 'round'; p.style.vectorEffect = 'non-scaling-stroke';
      p.style.transition = store.settings.reduceMotion ? 'none' : 'opacity .2s ease, stroke .2s ease, transform .2s ease';
    });
    return svg;
  }
  function strokePath(svg, id) { return svg.querySelector(`[id="${id}"]`); }
  function strokePaths(svg) { return [...svg.querySelectorAll('.stroke')]; }
  function stylePath(p, { visible = true, color = '#26333a', opacity = 1, width = 6, dash = '' } = {}) {
    if (!p) return;
    p.style.display = visible ? '' : 'none'; p.style.stroke = color; p.style.opacity = String(opacity); p.style.strokeWidth = String(width); p.style.strokeDasharray = dash;
  }
  function showIds(svg, ids, { otherVisible = false, otherColor = '#d7e0dd', otherOpacity = 1, targetColor = '#26333a', targetWidth = 6 } = {}) {
    const set = new Set(ids);
    strokePaths(svg).forEach(p => stylePath(p, set.has(p.id) ? { visible: true, color: targetColor, width: targetWidth } : { visible: otherVisible, color: otherColor, opacity: otherOpacity }));
  }
  function fitSvgToIds(svg, ids, pad = 10) {
    requestAnimationFrame(() => {
      const boxes = ids.map(id => strokePath(svg, id)).filter(Boolean).map(p => {
        try { return p.getBBox(); } catch (_) { return null; }
      }).filter(Boolean);
      if (!boxes.length) return;
      const x1 = Math.min(...boxes.map(b => b.x)), y1 = Math.min(...boxes.map(b => b.y));
      const x2 = Math.max(...boxes.map(b => b.x + b.width)), y2 = Math.max(...boxes.map(b => b.y + b.height));
      const w = Math.max(20, x2 - x1), h = Math.max(20, y2 - y1);
      svg.setAttribute('viewBox', `${x1 - pad} ${y1 - pad} ${w + pad * 2} ${h + pad * 2}`);
    });
  }
  function createGlyphStage(ch, className = '') {
    const stage = document.createElement('div'); stage.className = `glyph-stage grid ${className}`;
    const svg = makeSvg(ch, `${ch.kanji}の漢字`); stage.appendChild(svg);
    return { stage, svg };
  }
  function createSingleStrokePreview(ch, id, zoom = true) {
    const svg = makeSvg(ch, '一画の見本'); showIds(svg, [id]);
    if (zoom) fitSvgToIds(svg, [id], 12);
    return svg;
  }
  function createGroupPreview(ch, ids) {
    const svg = makeSvg(ch, 'まとまりの見本'); showIds(svg, ids); fitSvgToIds(svg, ids, 9); return svg;
  }
  function directionText(type) {
    if (!type) return '線の形';
    if (type.includes('㇐')) return '横の線';
    if (type.includes('㇑')) return '縦の線';
    if (type.includes('㇒')) return '左へはらう線';
    if (type.includes('㇏')) return '右へはらう線';
    if (type.includes('㇔')) return '点の形';
    return '線の向きと曲がり方';
  }
  function positionText(pos) {
    return ({ left: '左がわ', right: '右がわ', top: '上のほう', bottom: '下のほう', middle: '真ん中', inside: '中', outside: '外がわ', sides: '左右' })[pos] || '漢字の中';
  }
  function shuffled(list) { return [...list].sort(() => Math.random() - .5); }

  function renderIntro() {
    state.session.index = -1;
    state.game = null;
    renderTrack();
    setHeader('👀', 'まず、全体を見よう', '説明は一つ。ゆっくり形を見ます');
    const ch = currentChar();
    refs.gameBody.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'intro-layout';
    const { stage } = createGlyphStage(ch);
    const copy = document.createElement('div'); copy.className = 'intro-copy';
    copy.innerHTML = `<div class="eyebrow">${ch.reading}・${ch.strokeCount}画</div><h2>「${ch.kanji}」の形を見てみよう</h2><p>線の数、長さ、向き、どこで交わっているかを、ゆっくり見ます。全部覚えなくても大丈夫です。</p><div class="intro-tip">🌿 今日の目標は「正解すること」ではなく、<strong>一つでもひみつを見つけること</strong>です。</div>`;
    wrap.append(stage, copy); refs.gameBody.appendChild(wrap);
    setActions({ hint: false, whole: false, continueVisible: true, continueText: 'ゲームへ', action: () => startNextMission() });
  }

  function startNextMission() {
    state.session.index += 1;
    if (state.session.index >= state.session.queue.length) { finishSession(false); return; }
    const type = state.session.queue[state.session.index];
    state.game = { type, attempts: 0, wrongAttempts: 0, hints: 0, hintLevel: 0, completed: false, startedAt: Date.now() };
    renderTrack(); renderGame();
  }

  function renderGame() {
    const g = state.game;
    if (!g) return;
    const meta = GAMES[g.type];
    setHeader(meta.icon, meta.title, meta.skill);
    refs.gameBody.innerHTML = '';
    setActions({ hint: true, whole: true, continueVisible: false });
    if (g.type === 'stroke') renderStrokeHunt();
    if (g.type === 'part') renderPartHunt();
    if (g.type === 'difference') renderDifference();
    if (g.type === 'missing') renderMissing();
    if (g.type === 'order') renderOrder();
  }

  function gameInstruction(main, sub = '') {
    const el = document.createElement('div'); el.className = 'instruction'; el.innerHTML = `${main}${sub ? `<small>${sub}</small>` : ''}`; return el;
  }
  function feedbackEl(text = 'ゆっくり見てみよう。') { const el = document.createElement('div'); el.className = 'feedback'; el.textContent = text; return el; }

  function noteAttempt(correct, selected = '') {
    const g = state.game;
    g.attempts += 1;
    if (!correct) g.wrongAttempts += 1;
    g.lastSelected = selected;
  }
  function handleWrong(text) {
    noteAttempt(false);
    if (state.game.wrongAttempts >= 2) text += '<br><strong>ヒントを使ってもいいよ。</strong>';
    setFeedback(text, state.game.wrongAttempts >= 2 ? 'notice' : '');
  }
  function recordHint(kind = 'step') {
    if (!state.game || state.game.completed) return;
    state.game.hints += 1;
    state.game.hintKinds = state.game.hintKinds || [];
    state.game.hintKinds.push(kind);
  }

  function completeGame(message) {
    const g = state.game;
    if (g.completed) return;
    g.completed = true;
    g.finishedAt = Date.now();
    const ch = currentChar();
    const gr = getGameRecord(ch.id, g.type);
    gr.played += 1; gr.completed += 1; gr.attempts += g.attempts; gr.hints += g.hints;
    if (g.wrongAttempts > 0) gr.retries += 1;
    const result = {
      type: g.type, completed: true, attempts: g.attempts, wrongAttempts: g.wrongAttempts,
      hints: g.hints, hintKinds: g.hintKinds || [], durationMs: g.finishedAt - g.startedAt
    };
    state.session.results.push(result);
    saveStore();
    quietReward();
    const meta = GAMES[g.type];
    setHeader(meta.icon, 'ひみつを発見！', meta.skill);
    refs.gameBody.innerHTML = `<div class="success-card"><div class="success-icon">${meta.icon}</div><h2>よく見つけたね</h2><p>${message}</p><div class="feedback good">正解だけでなく、見直したこと・ヒントを使ったことも発見です。</div></div>`;
    const last = state.session.index >= state.session.queue.length - 1;
    setActions({ hint: false, whole: false, continueVisible: true, continueText: last ? 'ふりかえりへ' : 'つぎのゲーム', action: () => startNextMission() });
  }

  function quietReward() {
    if (store.settings.lowStim || store.settings.reduceMotion) return;
    for (let i = 0; i < 12; i++) {
      const dot = document.createElement('i'); dot.className = 'quiet-spark';
      dot.style.left = '50%'; dot.style.top = '48%';
      dot.style.setProperty('--dx', `${(Math.random() - .5) * 300}px`);
      dot.style.setProperty('--dy', `${(Math.random() - .5) * 230}px`);
      document.body.appendChild(dot); setTimeout(() => dot.remove(), 950);
    }
  }

  function renderStrokeHunt() {
    const ch = currentChar(), g = state.game;
    if (!g.targetId) g.targetId = ch.mutation.strokeId || ch.strokes[Math.floor(Math.random() * ch.strokes.length)].id;
    refs.gameBody.appendChild(gameInstruction('見本と同じ線を、漢字の中から見つけよう', '向き・長さ・場所を比べます。'));
    const row = document.createElement('div'); row.className = 'target-row';
    const targetCard = document.createElement('div'); targetCard.className = 'target-card'; targetCard.innerHTML = '<strong>この線をさがす</strong><div class="target-preview"></div>';
    targetCard.querySelector('.target-preview').appendChild(createSingleStrokePreview(ch, g.targetId, true));
    const { stage, svg } = createGlyphStage(ch);
    strokePaths(svg).forEach(p => {
      p.style.pointerEvents = 'stroke'; p.style.cursor = 'pointer'; p.style.strokeWidth = '7';
      p.setAttribute('tabindex', '0'); p.setAttribute('role', 'button');
      const choose = () => {
        if (g.completed) return;
        if (p.id === g.targetId) {
          noteAttempt(true, p.id); stylePath(p, { color: '#e8a748', width: 8 });
          completeGame('線の形だけでなく、漢字の中の場所まで見つけられました。');
        } else handleWrong('大丈夫。見本と、線の向きや長さをもう一度比べよう。');
      };
      p.addEventListener('click', choose); p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') choose(); });
    });
    if (g.hintLevel >= 2) strokePaths(svg).forEach(p => stylePath(p, p.id === g.targetId ? { color: '#26333a', width: 7 } : { color: '#d7e0dd', opacity: .34, width: 6 }));
    if (g.hintLevel >= 3) stylePath(strokePath(svg, g.targetId), { color: '#e8a748', width: 8 });
    row.append(targetCard, stage); refs.gameBody.append(row, feedbackEl(g.hintLevel === 1 ? `${directionText(ch.strokes.find(s => s.id === g.targetId)?.type)}を見てみよう。` : 'ゆっくり探してみよう。'));
  }

  function renderPartHunt() {
    const ch = currentChar(), g = state.game;
    if (!g.groupIndex && g.groupIndex !== 0) g.groupIndex = Math.floor(Math.random() * ch.groups.length);
    const group = ch.groups[g.groupIndex];
    refs.gameBody.appendChild(gameInstruction('見本と同じまとまりを見つけよう', '一つの線ではなく、まとまり全体を見ます。'));
    const row = document.createElement('div'); row.className = 'target-row';
    const card = document.createElement('div'); card.className = 'target-card'; card.innerHTML = `<strong>${group.label}</strong><div class="target-preview"></div>`;
    card.querySelector('.target-preview').appendChild(createGroupPreview(ch, group.strokeIds));
    const { stage, svg } = createGlyphStage(ch);
    const set = new Set(group.strokeIds);
    strokePaths(svg).forEach(p => {
      p.style.pointerEvents = 'stroke'; p.style.cursor = 'pointer'; p.style.strokeWidth = '7';
      const choose = () => {
        if (g.completed) return;
        if (set.has(p.id)) {
          noteAttempt(true, p.id); group.strokeIds.forEach(id => stylePath(strokePath(svg, id), { color: '#e8a748', width: 8 }));
          completeGame(`「${group.label}」が、漢字のどこにあるか見つけられました。`);
        } else handleWrong('もう一度、見本の線のまとまりと場所を比べてみよう。');
      };
      p.addEventListener('click', choose);
    });
    if (g.hintLevel >= 2) strokePaths(svg).forEach(p => stylePath(p, set.has(p.id) ? { color: '#26333a', width: 7 } : { color: '#d7e0dd', opacity: .28, width: 6 }));
    if (g.hintLevel >= 3) group.strokeIds.forEach(id => stylePath(strokePath(svg, id), { color: '#e8a748', width: 8 }));
    row.append(card, stage); refs.gameBody.append(row, feedbackEl(g.hintLevel === 1 ? `${positionText(group.position)}を見てみよう。` : 'まとまりの形と場所を比べよう。'));
  }

  function applyMutation(svg, config) {
    const p = strokePath(svg, config.strokeId); if (!p) return;
    if (config.type === 'shift') { p.setAttribute('transform', `translate(${config.dx || 0} ${config.dy || 0})`); return; }
    requestAnimationFrame(() => {
      let b; try { b = p.getBBox(); } catch (_) { return; }
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      if (config.type === 'scale') p.setAttribute('transform', `translate(${cx} ${cy}) scale(${config.sx || 1} ${config.sy || 1}) translate(${-cx} ${-cy})`);
      if (config.type === 'rotate') p.setAttribute('transform', `rotate(${config.deg || 0} ${cx} ${cy})`);
    });
  }

  function renderDifference() {
    const ch = currentChar(), g = state.game, config = ch.mutation;
    if (g.wrongLeft === undefined) g.wrongLeft = Math.random() < .5;
    refs.gameBody.appendChild(gameInstruction('少しちがう漢字は、どっち？', '違いは一つだけです。線の長さ・位置・向きを見ます。'));
    const row = document.createElement('div'); row.className = 'compare-row';
    const cards = [];
    [0, 1].forEach(i => {
      const isWrong = g.wrongLeft ? i === 0 : i === 1;
      const card = document.createElement('button'); card.className = 'compare-card'; card.setAttribute('aria-label', `${i + 1}番の漢字`);
      const svg = makeSvg(ch); card.appendChild(svg); row.appendChild(card); cards.push({ card, svg, isWrong });
      if (isWrong) applyMutation(svg, config);
      card.addEventListener('click', () => {
        if (g.completed) return;
        if (isWrong) {
          noteAttempt(true, i); cards.forEach(x => stylePath(strokePath(x.svg, config.strokeId), { color: '#e8a748', width: 8 }));
          completeGame(`「${config.detail}」の違いに気づけました。最後に正しい「${ch.kanji}」も確認しました。`);
        } else handleWrong('よく見ています。もう一つの字と、線の長さや場所を比べてみよう。');
      });
    });
    if (g.hintLevel >= 2) cards.forEach(({ svg }) => strokePaths(svg).forEach(p => stylePath(p, p.id === config.strokeId ? { color: '#26333a', width: 7 } : { color: '#d7e0dd', opacity: .3, width: 6 })));
    if (g.hintLevel >= 3) cards.forEach(({ svg }) => stylePath(strokePath(svg, config.strokeId), { color: '#e8a748', width: 8 }));
    refs.gameBody.append(row, feedbackEl(g.hintLevel === 1 ? `見るポイントは「${config.detail}」です。` : '二つを行ったり来たりして見ても大丈夫です。'));
  }

  function buildStrokeOptions(ch, targetId, count, preservePosition = false) {
    const ids = ch.strokes.map(s => s.id);
    const others = shuffled(ids.filter(id => id !== targetId)).slice(0, Math.max(0, count - 1));
    return shuffled([targetId, ...others]).map(id => ({ id, preservePosition }));
  }

  function renderMissing() {
    const ch = currentChar(), g = state.game;
    if (!g.targetId) g.targetId = ch.mutation.strokeId && ch.mutation.strokeId !== ch.strokes[0].id ? ch.mutation.strokeId : ch.strokes[ch.strokes.length - 1].id;
    if (!g.options) g.options = buildStrokeOptions(ch, g.targetId, Math.min(store.settings.choiceCount, ch.strokeCount), false);
    refs.gameBody.appendChild(gameInstruction('足りない一画は、どれ？', '消えた線を思い出して選びます。'));
    const { stage, svg } = createGlyphStage(ch);
    stylePath(strokePath(svg, g.targetId), { visible: false });
    if (g.hintLevel >= 2) stylePath(strokePath(svg, g.targetId), { visible: true, color: '#d7e0dd', opacity: .45, width: 6, dash: '2 2' });
    refs.gameBody.appendChild(stage);
    const row = document.createElement('div'); row.className = 'choice-row';
    let options = g.options;
    if (g.hintLevel >= 2 && options.length > 2) options = [options.find(o => o.id === g.targetId), options.find(o => o.id !== g.targetId)].filter(Boolean);
    options.forEach(o => {
      const btn = document.createElement('button'); btn.className = 'stroke-choice'; btn.appendChild(createSingleStrokePreview(ch, o.id, true));
      if (g.hintLevel >= 3 && o.id === g.targetId) btn.style.borderColor = '#e8a748';
      btn.addEventListener('click', () => {
        if (g.completed) return;
        if (o.id === g.targetId) {
          noteAttempt(true, o.id); stylePath(strokePath(svg, g.targetId), { visible: true, color: '#e8a748', width: 8 });
          completeGame('消えていた一画を、形から思い出して選べました。');
        } else handleWrong('大丈夫。空いている場所と、選んだ線の向きをもう一度比べよう。');
      });
      row.appendChild(btn);
    });
    refs.gameBody.append(row, feedbackEl(g.hintLevel === 1 ? '完成した形を一度見てから、もう一度考えても大丈夫です。' : '空いている場所にも目を向けよう。'));
  }

  function renderOrder() {
    const ch = currentChar(), g = state.game;
    if (g.orderStep === undefined) g.orderStep = 0;
    if (!g.options || g.optionsStep !== g.orderStep) {
      const target = ch.strokes[g.orderStep]?.id;
      g.options = target ? buildStrokeOptions(ch, target, Math.min(store.settings.choiceCount, ch.strokeCount), true) : [];
      g.optionsStep = g.orderStep;
    }
    if (g.orderStep >= ch.strokeCount) { completeGame('一画ずつ重ねて、最後まで順番を確かめられました。'); return; }
    const targetId = ch.strokes[g.orderStep].id;
    refs.gameBody.appendChild(gameInstruction(`つぎの ${g.orderStep + 1}画目は、どれ？`, '線の形だけでなく、漢字の中の場所も見ます。'));
    const { stage, svg } = createGlyphStage(ch);
    strokePaths(svg).forEach((p, i) => {
      if (i < g.orderStep) stylePath(p, { visible: true, color: '#26333a', width: 6 });
      else if (p.id === targetId && g.hintLevel >= 2) stylePath(p, { visible: true, color: '#e8a748', opacity: .8, width: 7 });
      else if (store.settings.ghostGuide) stylePath(p, { visible: true, color: '#d7e0dd', opacity: .28, width: 6 });
      else stylePath(p, { visible: false });
    });
    refs.gameBody.appendChild(stage);
    const row = document.createElement('div'); row.className = 'choice-row';
    g.options.forEach(o => {
      const btn = document.createElement('button'); btn.className = 'stroke-choice';
      const preview = createSingleStrokePreview(ch, o.id, false); btn.appendChild(preview);
      if (g.hintLevel >= 3 && o.id === targetId) btn.style.borderColor = '#e8a748';
      btn.addEventListener('click', () => {
        if (g.completed) return;
        if (o.id === targetId) {
          noteAttempt(true, o.id); g.orderStep += 1; g.hintLevel = 0; g.options = null;
          if (g.orderStep >= ch.strokeCount) renderOrder();
          else { renderGame(); setFeedback(`${g.orderStep}画目まで見つけたね。つぎもゆっくり見よう。`, 'good'); }
        } else handleWrong('順番を急がなくて大丈夫。今までの線と、つぎの場所を見てみよう。');
      });
      row.appendChild(btn);
    });
    const back = document.createElement('button'); back.className = 'soft-btn'; back.textContent = '一画もどる'; back.disabled = g.orderStep === 0;
    back.addEventListener('click', () => { if (g.orderStep > 0) { g.orderStep -= 1; g.options = null; g.hintLevel = 0; renderGame(); } });
    refs.gameBody.append(row, back, feedbackEl(g.hintLevel === 1 ? `${directionText(ch.strokes[g.orderStep]?.type)}を探してみよう。` : `${g.orderStep} / ${ch.strokeCount}画までできています。`));
  }

  function useHint() {
    const g = state.game; if (!g || g.completed) return;
    recordHint('step'); g.hintLevel = Math.min(3, g.hintLevel + 1);
    if (g.type === 'missing' && g.hintLevel === 1) { flashWhole(true); return; }
    renderGame();
  }

  function flashWhole(countAsHint = false) {
    if (countAsHint && state.game && !state.game.completed) recordHint('whole');
    const ch = currentChar();
    const overlay = document.createElement('div'); overlay.className = 'modal show';
    const card = document.createElement('div'); card.className = 'modal-card'; card.style.textAlign = 'center';
    card.innerHTML = `<h2>「${ch.kanji}」の全体</h2><p style="color:var(--muted)">見終わったら、画面をタップして戻ろう。</p>`;
    const { stage } = createGlyphStage(ch); stage.style.maxWidth = '360px'; stage.style.margin = 'auto'; card.appendChild(stage); overlay.appendChild(card); document.body.appendChild(overlay);
    overlay.addEventListener('click', () => overlay.remove());
  }

  function finishSession(early) {
    if (!state.session) return;
    state.session.early = early;
    state.session.endedAt = Date.now();
    showPage('reflection'); renderReflection();
  }

  function renderReflection() {
    const ch = currentChar();
    refs.rewardReveal.classList.remove('show');
    refs.strategyGrid.innerHTML = '';
    STRATEGIES.forEach(s => {
      const b = document.createElement('button'); b.className = `strategy-btn ${state.reflectionStrategies.has(s.id) ? 'selected' : ''}`;
      b.innerHTML = `<span>${s.icon}</span>${s.label}`;
      b.addEventListener('click', () => {
        if (s.id === 'none') state.reflectionStrategies = new Set(state.reflectionStrategies.has('none') ? [] : ['none']);
        else { state.reflectionStrategies.delete('none'); state.reflectionStrategies.has(s.id) ? state.reflectionStrategies.delete(s.id) : state.reflectionStrategies.add(s.id); if (state.reflectionStrategies.size > 2) state.reflectionStrategies.delete([...state.reflectionStrategies][0]); }
        renderReflection();
      });
      refs.strategyGrid.appendChild(b);
    });
    refs.writingGrid.innerHTML = '';
    WRITING.forEach(w => {
      const b = document.createElement('button'); b.className = `writing-btn ${state.writingChoice === w.id ? 'selected' : ''}`; b.textContent = w.label;
      b.addEventListener('click', () => { state.writingChoice = w.id; renderReflection(); }); refs.writingGrid.appendChild(b);
    });
    refs.rewardKanji.textContent = ch.kanji;
  }

  function saveReflection() {
    const ch = currentChar(), r = getRecord(ch.id);
    const strategies = [...state.reflectionStrategies];
    strategies.forEach(id => { r.reflections[id] = (r.reflections[id] || 0) + 1; });
    if (state.writingChoice) r.writing[state.writingChoice] = (r.writing[state.writingChoice] || 0) + 1;
    const session = {
      id: state.session.id, charId: ch.id, kanji: ch.kanji,
      startedAt: new Date(state.session.startedAt).toISOString(), endedAt: new Date(state.session.endedAt || Date.now()).toISOString(),
      durationMs: (state.session.endedAt || Date.now()) - state.session.startedAt,
      early: state.session.early, queue: state.session.queue, results: state.session.results,
      strategies, writingChoice: state.writingChoice
    };
    store.sessions.push(session);
    r.card = completedGameTypes(ch.id).length >= 3;
    saveStore();
    refs.rewardReveal.classList.add('show');
    const finished = session.results.length;
    refs.rewardTitle.textContent = state.session.early ? '今日の発見を残したよ' : 'よく見つけたね！';
    const methodText = strategies.length && !strategies.includes('none') ? `今日は「${strategies.map(id => STRATEGIES.find(s => s.id === id)?.label).filter(Boolean).join('」「')}」が使いやすかったね。` : '今日は、選ばないことも自分で決められました。';
    refs.rewardText.textContent = `${finished}つのゲームで発見しました。${methodText}`;
    quietReward();
  }

  function renderNotebook() {
    refs.bookGrid.innerHTML = CHARS.map(ch => {
      const found = isDiscovered(ch.id), done = completedGameTypes(ch.id).length;
      return `<div class="book-card ${found ? 'found' : ''}"><div class="k">${found ? ch.kanji : '？'}</div><strong>${found ? ch.reading : 'まだ ひみつ'}</strong><small>${done} / 5ゲーム</small></div>`;
    }).join('');
    const totals = aggregateAllGames();
    const discoveries = CHARS.filter(c => isDiscovered(c.id)).length;
    const title = discoveries >= 18 ? ['🏆','はっけん名人'] : discoveries >= 12 ? ['🧩','くらべるひと'] : discoveries >= 7 ? ['⭐','きづくひと'] : discoveries >= 3 ? ['🔍','みつけるひと'] : ['👀','みるひと'];
    refs.titleBadge.innerHTML = `<div class="big">${title[0]}</div><strong>${title[1]}</strong><div style="font-size:12px;color:var(--muted);margin-top:4px">発見カード ${discoveries}枚</div>`;
    const skillDefs = [
      ['選んで見る力','stroke'],['まとまりを見る力','part'],['違いに気づく力','difference'],['思い出す力','missing'],['順番を見る力','order']
    ];
    const max = Math.max(1, ...skillDefs.map(([, id]) => totals[id]?.completed || 0));
    refs.skillBars.innerHTML = skillDefs.map(([label,id]) => `<div class="skill-row"><div class="skill-label"><span>${label}</span><b>${totals[id]?.completed || 0}回</b></div><div class="skill-bar"><span style="width:${(totals[id]?.completed || 0) / max * 100}%"></span></div></div>`).join('');
    renderMethodList(refs.methodList, strategyCounts(store.sessions));
  }

  function aggregateAllGames() {
    const totals = {};
    Object.values(store.records).forEach(r => Object.entries(r.games || {}).forEach(([id, v]) => {
      totals[id] = totals[id] || { played:0, completed:0, attempts:0, hints:0, retries:0 };
      Object.keys(totals[id]).forEach(k => totals[id][k] += v[k] || 0);
    }));
    return totals;
  }
  function strategyCounts(sessions) {
    const counts = {};
    sessions.forEach(s => (s.strategies || []).forEach(id => { if (id !== 'none') counts[id] = (counts[id] || 0) + 1; }));
    return counts;
  }
  function renderMethodList(el, counts) {
    const rows = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,6);
    if (!rows.length) { el.innerHTML = '<p class="page-sub">まだ記録がありません。振り返りをすると、ここに表示されます。</p>'; return; }
    el.innerHTML = rows.map(([id,n]) => { const s = STRATEGIES.find(x => x.id === id); return `<div class="method-item"><span>${s?.icon || '・'} ${s?.label || id}</span><b>${n}回</b></div>`; }).join('');
  }

  function sessionsForRange(range) {
    if (range === 'all') return store.sessions;
    const now = new Date(); const start = new Date(now);
    if (range === 'today') start.setHours(0,0,0,0); else start.setDate(now.getDate() - 6), start.setHours(0,0,0,0);
    return store.sessions.filter(s => new Date(s.endedAt || s.startedAt) >= start);
  }
  function renderAdult() {
    const sessions = sessionsForRange(refs.reportRange.value);
    const games = sessions.flatMap(s => s.results || []);
    const unique = new Set(sessions.map(s => s.charId));
    const hints = games.reduce((n,g) => n + (g.hints || 0), 0);
    const retries = games.filter(g => g.completed && g.wrongAttempts > 0).length;
    refs.reportCards.innerHTML = [
      ['学習した回数', sessions.length], ['見た漢字', unique.size], ['ゲームの発見', games.filter(g=>g.completed).length], ['再挑戦して発見', retries]
    ].map(([label,n]) => `<div class="report-card"><b>${n}</b><span>${label}</span></div>`).join('');
    const methods = strategyCounts(sessions); renderMethodList(refs.adultMethods, methods);
    const gameCounts = {};
    games.forEach(g => { gameCounts[g.type] = gameCounts[g.type] || {completed:0,hints:0,retries:0}; gameCounts[g.type].completed += g.completed ? 1 : 0; gameCounts[g.type].hints += g.hints || 0; gameCounts[g.type].retries += g.wrongAttempts > 0 && g.completed ? 1 : 0; });
    const topGame = Object.entries(gameCounts).sort((a,b) => b[1].completed - a[1].completed)[0];
    const insight = [];
    if (!sessions.length) insight.push('まだこの期間の記録はありません。実際の試用では、正答数だけでなく、再挑戦やヒント選択の様子を観察します。');
    else {
      if (topGame) insight.push(`この期間は「${GAMES[topGame[0]].title}」に最も多く取り組みました。`);
      if (retries) insight.push(`${retries}回、うまくいかなかった後に見直して発見できました。`);
      if (hints) insight.push(`ヒントは${hints}回使われました。ヒント利用は失敗ではなく、使いやすい支援を見つけた記録です。`);
    }
    refs.adultInsights.innerHTML = `<div class="insight">${insight.join('<br>')}</div>`;

    const rows = {};
    sessions.forEach(s => {
      const row = rows[s.charId] || { games:new Set(), hints:0, retries:0, card:isDiscovered(s.charId) };
      (s.results || []).forEach(g => { if(g.completed) row.games.add(g.type); row.hints += g.hints || 0; if(g.completed && g.wrongAttempts>0) row.retries++; }); rows[s.charId] = row;
    });
    refs.adultTableBody.innerHTML = Object.entries(rows).sort((a,b) => CHAR_MAP[a[0]].officialOrder - CHAR_MAP[b[0]].officialOrder).map(([id,r]) => `<tr><td><strong>${CHAR_MAP[id].kanji}</strong> ${CHAR_MAP[id].reading}</td><td>${r.games.size}</td><td>${r.hints}</td><td>${r.retries}</td><td>${r.card?'あり':'—'}</td></tr>`).join('') || '<tr><td colspan="5">記録はまだありません。</td></tr>';

    const topMethod = Object.entries(methods).sort((a,b)=>b[1]-a[1])[0];
    if (topMethod) {
      const s = STRATEGIES.find(x=>x.id===topMethod[0]);
      refs.supportTip.innerHTML = `<strong>関わり方のヒント</strong><br>最近は「${s.label}」が使いやすかったと選ばれています。次の漢字でも最初の選択肢として提案できますが、別の方法を選べる余地を残します。`;
    } else if (hints) refs.supportTip.innerHTML = '<strong>関わり方のヒント</strong><br>見本や候補を残して始め、見つけられた後に少しずつ手掛かりを薄くする方法が考えられます。';
    else refs.supportTip.innerHTML = '<strong>関わり方のヒント</strong><br>記録がたまると、最近使いやすかった方法を具体的に表示します。';
  }

  function renderGamePicker() {
    const ch = currentChar(), supported = supportedGames(ch);
    refs.gamePicker.innerHTML = '';
    Object.values(GAMES).forEach(g => {
      const b = document.createElement('button'); b.className = `game-pick ${state.pickedGame === g.id ? 'selected' : ''}`; b.disabled = !supported.includes(g.id);
      b.innerHTML = `<span>${g.icon}</span>${g.title}`; b.addEventListener('click', () => { state.pickedGame = g.id; renderGamePicker(); }); refs.gamePicker.appendChild(b);
    });
  }

  function openModal(el) { el.classList.add('show'); }
  function closeModal(el) { el.classList.remove('show'); }

  // Events
  refs.nav.forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
  refs.startRecommended.addEventListener('click', () => startSession(buildRecommendedQueue(currentChar(), store.settings.missionCount)));
  refs.openPicker.addEventListener('click', () => { state.pickedGame = supportedGames(currentChar())[0]; renderGamePicker(); openModal(refs.pickerModal); });
  refs.startPicked.addEventListener('click', () => { if (state.pickedGame) { closeModal(refs.pickerModal); startSession([state.pickedGame]); } });
  refs.cancelPicker.addEventListener('click', () => closeModal(refs.pickerModal));
  refs.backHome.addEventListener('click', () => { if (state.session) openModal(refs.pauseModal); else showPage('home'); });
  refs.pause.addEventListener('click', () => openModal(refs.pauseModal));
  refs.resume.addEventListener('click', () => closeModal(refs.pauseModal));
  refs.finishEarly.addEventListener('click', () => { closeModal(refs.pauseModal); finishSession(true); });
  refs.hint.addEventListener('click', useHint);
  refs.showWhole.addEventListener('click', () => flashWhole(true));
  refs.continueBtn.addEventListener('click', () => { if (typeof state.continueAction === 'function') state.continueAction(); });
  refs.saveReflection.addEventListener('click', saveReflection);
  refs.rewardHome.addEventListener('click', () => { state.session = null; state.game = null; showPage('home'); });
  refs.reportRange.addEventListener('change', renderAdult);
  refs.settingsBtn.addEventListener('click', () => openModal(refs.settingsModal));
  refs.closeSettings.addEventListener('click', () => closeModal(refs.settingsModal));
  refs.lowStim.addEventListener('change', () => { store.settings.lowStim = refs.lowStim.checked; saveStore(); applySettings(); });
  refs.reduceMotion.addEventListener('change', () => { store.settings.reduceMotion = refs.reduceMotion.checked; saveStore(); applySettings(); });
  refs.ghostGuide.addEventListener('change', () => { store.settings.ghostGuide = refs.ghostGuide.checked; saveStore(); });
  refs.missionCount.addEventListener('change', () => { store.settings.missionCount = Number(refs.missionCount.value); saveStore(); });
  refs.choiceCount.addEventListener('change', () => { store.settings.choiceCount = Number(refs.choiceCount.value); saveStore(); });
  [refs.settingsModal, refs.pauseModal, refs.pickerModal].forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModal(m); }));
  refs.exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kanji-tanken-record-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
  });
  refs.resetBtn.addEventListener('click', () => {
    if (confirm('この端末の学習記録をすべて消しますか？')) { store = defaultStore(); state.selectedId = CHARS[0].id; saveStore(); applySettings(); renderAdult(); renderHome(); }
  });

  window.addEventListener('pagehide', saveStore);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveStore();
  });

  applySettings(); renderHome(); renderNotebook(); renderAdult();
})();
