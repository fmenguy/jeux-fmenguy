(function () {
  const D = window.STRATES_AGENTS;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf = (v, d = 0) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  const tok = v => v >= 1e9 ? nf(v / 1e9, 2) + ' Md' : v >= 1e6 ? nf(v / 1e6, v >= 1e8 ? 0 : 1) + ' M' : v >= 1e3 ? nf(v / 1e3, 0) + 'k' : nf(v);
  const eur = (v, d) => nf(v, d === undefined ? (v < 10 ? 2 : v < 100 ? 1 : 0) : d) + ' €';
  const dur = s => { const m = Math.round(s / 60); if (m < 60) return m + ' min'; const h = Math.floor(m / 60); return h + ' h ' + String(m % 60).padStart(2, '0'); };
  const dshort = iso => new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short' });
  const dtime = iso => new Date(iso).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RATE = 0.8909;
  const KANBAN = 'https://strates.fmenguy.fr/docs/v2/retours/v2-20260925/kanban';

  const MODELS = {
    opus55: { label: 'Opus 5.5', color: 'var(--m-opus55)' },
    opus5: { label: 'Opus 5', color: 'var(--m-opus5)' },
    sonnet: { label: 'Sonnet', color: 'var(--m-sonnet)' },
    astra: { label: 'GPT-6 Astra', color: 'var(--m-astra)' },
    sol: { label: 'GPT-6 Sol', color: 'var(--m-sol)' },
    fable: { label: 'Fable', color: 'var(--m-fable)' }
  };
  const mkey = m => !m ? 'sonnet' : m === 'claude-opus-5-5' ? 'opus55' : m === 'claude-opus-5' ? 'opus5' : /sonnet/.test(m) ? 'sonnet' : /astra/.test(m) ? 'astra' : /sol/.test(m) ? 'sol' : /fable/.test(m) ? 'fable' : 'sonnet';
  const mlabel = m => ({ 'claude-opus-5-5': 'Opus 5.5', 'claude-opus-5': 'Opus 5', 'claude-sonnet-5': 'Sonnet 5', 'gpt-6-astra': 'GPT-6 Astra', 'gpt-6-sol': 'GPT-6 Sol', 'gpt-6.1-sol': 'GPT-6.1 Sol', sonnet: 'Sonnet (déclaré)', fable: 'Fable (déclaré)' }[m] || m);
  const PR = {
    'claude-opus-5-5': { i: 4, w5: 5, w1: 8, r: 0.2, o: 20 },
    'claude-opus-5': { i: 5, w5: 6.25, w1: 10, r: 0.5, o: 25 },
    'claude-sonnet-5': { i: 2, w5: 2.5, w1: 4, r: 0.2, o: 10 },
    'gpt-6-astra': { i: 10, w5: 10, w1: 10, r: 1, o: 50 },
    'gpt-6-sol': { i: 2, w5: 2, w1: 2, r: 0.2, o: 10 },
    'gpt-6.1-sol': { i: 2, w5: 2, w1: 2, r: 0.1, o: 10 }
  };
  const tokOf = t => t ? t.i + t.w5 + t.w1 + t.r + t.o : 0;
  const costOf = (t, m) => { const p = PR[m]; if (!p || !t) return 0; return (t.i * p.i + t.w5 * p.w5 + t.w1 * p.w1 + t.r * p.r + t.o * p.o) / 1e6 * RATE; };
  const FAM = { impl: 'Implémenter', ctrl: 'Contrôler', chain: 'Enchaîner', audit: 'Auditer', poc: 'Maquetter', tool: 'Outiller' };
  const AXES = ['UI', 'UX', 'Backend', 'Frontend', 'Données', 'Tests', 'Relecture', 'Cartes'];
  const cardOf = a => { if (a.card) return a.card; const m = (a.name + ' ' + (a.prompt || '').slice(0, 1500)).match(/\b(BUG|EVO|MIG)-\d+\b/); return m ? m[0] : null; };

  const orchs = D.orchestrators.slice().sort((a, b) => a.start.localeCompare(b.start));
  const agents = D.agents.map(a => {
    const name = a.kind === 'codex' && a.nick ? a.nick + ' · ' + a.name : (a.name === 'Session directe' ? 'Session ' + mlabel(a.model) + ' du ' + dshort(a.start) : a.name);
    return Object.assign({}, a, { label: name, tokens: tokOf(a.tok), cost: costOf(a.tok, a.model), dur: (Date.parse(a.end) - Date.parse(a.start)) / 1000, mk: mkey(a.model), cardId: cardOf(a) });
  });
  const archived = D.archived.map(a => Object.assign({}, a, { label: a.name, tokens: 0, cost: 0, mk: mkey(a.model) }));
  const byId = {};
  agents.forEach(a => byId[a.id] = a); archived.forEach(a => byId[a.id] = a); orchs.forEach(o => byId[o.id] = o);
  const CUR = 'c-24bea6e4';
  const CARDS = (window.STRATES_CARDS || { cards: [] }).cards;
  const cardById = {}; CARDS.forEach(c => cardById[c.id] = c);
  const STATUS = { done: 'clos', doing: 'en cours', todo: 'à faire', archived: 'archivé', autre: 'hors kanban' };
  const orchLabel = o => (o.kind === 'claude' ? 'Pilote' : 'Fil Codex') + ' · ' + (dshort(o.start) === dshort(o.end) ? dshort(o.start) : dshort(o.start) + ' au ' + dshort(o.end));

  /* tooltip */
  const tip = $('#tip');
  const showTip = (html, ev) => {
    tip.innerHTML = html; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 16;
    if (y + h > innerHeight - 8) y = ev.clientY - h - 16;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
  };
  const hideTip = () => { tip.hidden = true; };
  addEventListener('scroll', hideTip, { passive: true });
  const row = (k, v, c) => `<div class="r"><span>${c ? `<i class="dot" style="background:${c};margin-right:7px;width:9px;height:9px"></i>` : ''}${esc(k)}</span><span>${v}</span></div>`;

  /* compteurs */
  function renderCounters() {
    const totTok = agents.reduce((s, a) => s + a.tokens, 0) + orchs.reduce((s, o) => s + tokOf(o.tok), 0);
    const totEur = agents.reduce((s, a) => s + a.cost, 0) + orchs.reduce((s, o) => s + costOf(o.tok, o.models[o.models.length - 1]), 0);
    const humanN = orchs.reduce((s, o) => s + o.human.length, 0) + agents.reduce((s, a) => s + (a.humanN || 0), 0);
    const delivered = CARDS.filter(c => /^(BUG|EVO|MIG)/.test(c.id) && c.commits > 0).length;
    const C = [
      [agents.length + archived.length, 'agents écrits', false],
      [delivered, 'cartes du kanban livrées', false],
      [orchs.length, 'orchestrateurs', false],
      [totTok, 'tokens traités', true, tok],
      [totEur, 'équivalent API', true, v => eur(v, 0)]
    ];
    $('#counters').innerHTML = C.map((c, i) => `<div class="counter${c[2] ? ' hot' : ''}"><b data-i="${i}">0</b><span>${esc(c[1])}${i === 2 ? ', ' + humanN + ' messages de François' : ''}</span></div>`).join('');
    const els = document.querySelectorAll('.counter b');
    const t0 = performance.now(), T = REDUCED ? 0 : 1200;
    const step = now => {
      const k = T ? Math.min(1, (now - t0) / T) : 1, e = 1 - Math.pow(1 - k, 3);
      C.forEach((c, i) => { const v = c[0] * e; els[i].textContent = c[3] ? c[3](v) : nf(Math.round(v)); });
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    $('#modelLegend').innerHTML = Object.entries(MODELS).map(([k, m]) => `<span class="chip" style="cursor:default"><i class="dot" style="background:${m.color}"></i>${m.label} <span class="mono muted">${agents.filter(a => a.mk === k).length + archived.filter(a => a.mk === k).length}</span></span>`).join('');
  }

  /* ===================== ARBRE ===================== */
  const tf = { models: new Set(Object.keys(MODELS)), min: 0 };
  const maxTok = Math.max(...agents.map(a => a.tokens));
  const sliderTok = v => v <= 0 ? 0 : Math.round(Math.pow(v / 100, 2.4) * maxTok);
  const keep = a => tf.models.has(a.mk) && (a.kind === 'archive' || a.tokens >= tf.min);
  function toolKids(a) {
    const counts = {}, cmds = {};
    for (const x of a.acts || []) {
      const t = x[1] === 'PowerShell' ? 'Bash' : x[1];
      counts[t] = (counts[t] || 0) + 1;
      if (x[5]) { (cmds[t] ||= {}); cmds[t][x[5]] = (cmds[t][x[5]] || 0) + 1; }
    }
    return Object.entries(counts).sort((p, q) => q[1] - p[1]).slice(0, 9).map(([t, n]) => ({
      id: a.id + '|t|' + t, kind: 'tool', name: t, n,
      kids: cmds[t] ? Object.entries(cmds[t]).sort((p, q) => q[1] - p[1]).slice(0, 8).map(([c, m]) => ({ id: a.id + '|c|' + t + '|' + c, kind: 'cmd', name: c, n: m })) : null
    }));
  }
  function agentNode(a) {
    return { id: a.id, kind: 'agent', name: a.label, ref: a, mk: a.mk, n: a.tokens, kids: a.kind === 'archive' ? a.tools.map(t => ({ id: a.id + '|t|' + t, kind: 'tool', name: t, n: null })) : toolKids(a) };
  }
  function buildTree() {
    const claude = orchs.filter(o => o.kind === 'claude').map(o => {
      const mine = agents.filter(a => a.parent === o.id && keep(a));
      const fams = Object.keys(FAM).map(f => ({ f, list: mine.filter(a => a.family === f) })).filter(x => x.list.length);
      const kids = fams.map(x => ({ id: o.id + '|f|' + x.f, kind: 'family', name: FAM[x.f], n: x.list.length, kids: x.list.sort((p, q) => p.start.localeCompare(q.start)).map(agentNode) }));
      const own = Object.entries(o.toolCounts || {}).sort((p, q) => q[1] - p[1]).slice(0, 8).map(([t, n]) => ({ id: o.id + '|ot|' + t, kind: 'tool', name: t, n }));
      kids.push({ id: o.id + '|own', kind: 'family', name: 'Ses propres outils', n: null, kids: own });
      return { id: o.id, kind: 'orch', name: orchLabel(o), ref: o, mk: mkey(o.models[o.models.length - 1]), n: tokOf(o.tok), kids };
    });
    const codexO = orchs.filter(o => o.kind === 'codex').map(o => ({ id: o.id, kind: 'orch', name: orchLabel(o), ref: o, mk: mkey(o.models[0]), n: tokOf(o.tok), kids: agents.filter(a => a.parent === o.id && keep(a)).sort((p, q) => p.start.localeCompare(q.start)).map(agentNode) }));
    const direct = agents.filter(a => a.parent === 'codex-direct' && keep(a)).sort((p, q) => p.start.localeCompare(q.start)).map(agentNode);
    if (direct.length) codexO.push({ id: 'codex-direct', kind: 'family', name: 'Sessions directes', n: direct.length, kids: direct });
    const v1 = archived.filter(keep).map(agentNode);
    return {
      id: 'root', kind: 'human', name: 'François', kids: [
        { id: 'g-claude', kind: 'group', name: 'Pilote Claude', kids: claude },
        { id: 'g-codex', kind: 'group', name: 'Codex', kids: codexO },
        { id: 'g-v1', kind: 'group', name: 'Juin 2026, agents par couche', kids: v1 }
      ]
    };
  }
  const expanded = new Set(['root', 'g-claude', 'g-codex', 'g-v1', CUR, CUR + '|f|impl', CUR + '|f|ctrl']);
  let selId = null;
  const box = $('#treeBox');
  const svg = d3.select(box).append('svg').attr('role', 'img').attr('aria-label', "Arbre des agents de Strates");
  const gRoot = svg.append('g');
  const gL = gRoot.append('g'), gN = gRoot.append('g');
  const zoom = d3.zoom().scaleExtent([0.25, 2.5]).on('zoom', e => gRoot.attr('transform', e.transform));
  svg.call(zoom).on('dblclick.zoom', null);
  const prev = new Map();
  const DX = 26, DY = 250;
  const nodeR = d => {
    const k = d.data.kind;
    if (k === 'human') return 14;
    if (k === 'group') return 9;
    if (k === 'orch') return 11;
    if (k === 'family') return 7;
    if (k === 'agent') return d.data.n ? Math.max(5, Math.min(17, Math.sqrt(d.data.n / 1e6) * 2.2)) : 6;
    return 4;
  };
  const nodeFill = d => {
    const k = d.data.kind;
    if (k === 'human') return 'var(--text)';
    if (k === 'agent' || k === 'orch') return MODELS[d.data.mk] ? MODELS[d.data.mk].color : 'var(--muted)';
    if (k === 'group' || k === 'family') return 'var(--accent)';
    if (k === 'tool') return 'var(--muted)';
    return 'var(--line)';
  };
  const labelOf = d => {
    const x = d.data;
    const short = x.name.length > 40 ? x.name.slice(0, 38) + '…' : x.name;
    let sub = '';
    if (x.kind === 'agent' || x.kind === 'orch') sub = x.n ? tok(x.n) : (x.ref && x.ref.kind === 'archive' ? mlabel(x.ref.model) : '');
    else if (x.kind === 'tool' || x.kind === 'cmd') sub = x.n ? '× ' + nf(x.n) : '';
    else if (x.kind === 'family' && x.n) sub = String(x.n);
    return { short, sub };
  };
  function render(focus) {
    const data = buildTree();
    const root = d3.hierarchy(data, d => expanded.has(d.id) ? (d.kids || null) : null);
    d3.tree().nodeSize([DX, DY]).separation((a, b) => (a.parent === b.parent ? 1 : 1.25))(root);
    const nodes = root.descendants(), links = root.links();
    const T = REDUCED ? 0 : 450;
    const pos = id => prev.get(id);
    const origin = d => { let p = d.parent; while (p && !pos(p.data.id)) p = p.parent; const o = p ? pos(p.data.id) : { x: d.x, y: d.y }; return o; };
    const diag = d3.linkHorizontal().x(p => p.y).y(p => p.x);
    const selPath = new Set();
    if (selId) { const s = nodes.find(n => n.data.id === selId); let p = s; while (p) { selPath.add(p.data.id); p = p.parent; } }
    gL.selectAll('path.link').data(links, d => d.target.data.id).join(
      en => en.append('path').attr('class', 'link').attr('d', d => { const o = origin(d.target); return diag({ source: o, target: o }); }),
      up => up,
      ex => ex.transition().duration(T).attr('d', d => { const o = { x: d.source.x, y: d.source.y }; return diag({ source: o, target: o }); }).remove()
    ).attr('class', d => 'link' + ((d.target.data.kind === 'agent' || d.target.data.kind === 'orch') ? ' flow' : '') + (selPath.has(d.target.data.id) ? ' hl' : ''))
      .transition().duration(T).attr('d', d => diag(d));
    const ng = gN.selectAll('g.node').data(nodes, d => d.data.id).join(
      en => {
        const g = en.append('g').attr('class', d => 'node k-' + d.data.kind).attr('transform', d => { const o = origin(d); return `translate(${o.y},${o.x})`; }).attr('tabindex', 0).attr('role', 'button');
        g.append('circle').attr('class', 'ring');
        g.append('circle').attr('class', 'c');
        g.append('text').attr('class', 'lbl').attr('dy', '0.35em');
        g.append('text').attr('class', 'badge').attr('text-anchor', 'middle').attr('dy', '0.35em');
        g.on('click', (ev, d) => onNode(d));
        g.on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onNode(d); } });
        g.on('mousemove', (ev, d) => { const x = d.data; if (x.kind === 'agent' || x.kind === 'orch') showTip(`<b>${esc(x.name)}</b>${x.ref && x.ref.model ? row('Modèle', mlabel(x.ref.model)) : ''}${x.n ? row('Tokens traités', tok(x.n)) : ''}${x.ref && x.ref.acts ? row("Appels d'outils", nf(x.ref.actsN || x.ref.acts.length)) : ''}`, ev); else if (x.kind === 'tool' || x.kind === 'cmd') showTip(`<b>${esc(x.name)}</b>${x.n ? row('Appels', nf(x.n)) : row('Outil déclaré', '')}`, ev); });
        g.on('mouseleave', hideTip);
        return g;
      },
      up => up,
      ex => ex.transition().duration(T).attr('transform', d => `translate(${d.parent ? d.parent.y : d.y},${d.parent ? d.parent.x : d.x})`).style('opacity', 0).remove()
    );
    ng.classed('sel', d => d.data.id === selId).attr('aria-label', d => d.data.name);
    ng.select('circle.c').attr('r', nodeR).style('fill', nodeFill);
    ng.select('circle.ring').attr('r', d => nodeR(d) + 5);
    ng.select('text.badge').text(d => { const has = d.data.kids && d.data.kids.length; return has && !expanded.has(d.data.id) && nodeR(d) >= 7 ? '+' : ''; });
    ng.select('text.lbl').attr('x', d => d.data.kind === 'human' ? -20 : nodeR(d) + 8).attr('text-anchor', d => d.data.kind === 'human' ? 'end' : 'start')
      .each(function (d) { const l = labelOf(d); const t = d3.select(this); t.text(null); t.append('tspan').text(l.short); if (l.sub) t.append('tspan').attr('class', 'sub').attr('dx', 7).text(l.sub); });
    ng.transition().duration(T).attr('transform', d => `translate(${d.y},${d.x})`).style('opacity', 1);
    nodes.forEach(d => prev.set(d.data.id, { x: d.x, y: d.y }));
    if (focus) {
      const f = nodes.find(n => n.data.id === focus);
      if (f) { const w = box.clientWidth; svg.transition().duration(T).call(zoom.translateTo, f.y + w * 0.18, f.x); }
    }
  }
  function onNode(d) {
    const x = d.data;
    if (x.kids && x.kids.length) { if (expanded.has(x.id)) expanded.delete(x.id); else expanded.add(x.id); }
    if (x.kind === 'agent' || x.kind === 'orch') { selId = x.id; showDrawer(x.ref); }
    render(x.id);
  }
  function fit() { const h = box.clientHeight; svg.transition().duration(REDUCED ? 0 : 500).call(zoom.transform, d3.zoomIdentity.translate(90, h / 2).scale(1)); }
  $('#zin').onclick = () => svg.transition().call(zoom.scaleBy, 1.3);
  $('#zout').onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.3);
  $('#zfit').onclick = fit;
  $('#treeOpen').onclick = () => { (function walk(n) { if (n.kids && n.kids.length && n.kind !== 'agent' && n.kind !== 'tool') { expanded.add(n.id); n.kids.forEach(walk); } })(buildTree()); render(); fit(); };
  $('#treeClose').onclick = () => { expanded.clear(); ['root', 'g-claude', 'g-codex', 'g-v1'].forEach(i => expanded.add(i)); render(); fit(); };
  function renderTreeChips() {
    $('#treeModels').innerHTML = Object.entries(MODELS).map(([k, m]) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${tf.models.has(k)}"><i class="dot" style="background:${m.color}"></i>${m.label}</button>`).join('');
    document.querySelectorAll('#treeModels .chip').forEach(b => b.onclick = () => { const k = b.dataset.k; if (tf.models.has(k) && tf.models.size > 1) tf.models.delete(k); else tf.models.add(k); renderTreeChips(); render(); });
  }
  $('#treeMin').addEventListener('input', e => { tf.min = sliderTok(+e.target.value); $('#treeMinV').textContent = tok(tf.min); render(); });

  /* fiche */
  function sparkline(el, curve) {
    if (!curve || curve.length < 2) { el.innerHTML = ''; return; }
    const W = 360, H = 90;
    const x = d3.scaleLinear().domain(d3.extent(curve, d => d[0])).range([4, W - 4]);
    const y = d3.scaleLinear().domain([0, d3.max(curve, d => d[1])]).nice().range([H - 16, 6]);
    const area = d3.area().x(d => x(d[0])).y0(H - 16).y1(d => y(d[1])).curve(d3.curveMonotoneX);
    const line = d3.line().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveMonotoneX);
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block"><path d="${area(curve)}" style="fill:var(--accent);opacity:.14"/><path d="${line(curve)}" style="fill:none;stroke:var(--accent);stroke-width:2"/><text x="4" y="${H - 2}" style="font-family:var(--f-mono);font-size:10px;fill:var(--muted)">contexte à chaque appel, max ${tok(d3.max(curve, d => d[1]))}</text></svg>`;
  }
  function showDrawer(a) {
    const el = $('#drawer');
    if (!a) { el.innerHTML = `<p class="empty">Clique un agent ou un orchestrateur dans l'arbre.</p>`; return; }
    if (a.models) {
      const o = a;
      const n = agents.filter(x => x.parent === o.id).length;
      el.innerHTML = `<div class="tags"><span class="tag"><i class="dot" style="background:${MODELS[mkey(o.models[o.models.length - 1])].color}"></i>${esc(o.models.map(mlabel).join(' puis '))}</span><span class="tag">orchestrateur</span></div>
        <h3>${esc(orchLabel(o))}</h3>
        <div class="mini"><div><b>${n}</b><span>sous-agents</span></div><div><b>${nf(o.human.length)}</b><span>messages de François</span></div><div><b>${nf(o.tok.n)}</b><span>appels au modèle</span></div><div><b>${tok(tokOf(o.tok))}</b><span>tokens traités</span></div><div><b>${eur(costOf(o.tok, o.models[o.models.length - 1]), 0)}</b><span>équivalent API</span></div><div><b>${nf(o.actsN)}</b><span>appels d'outils</span></div></div>
        <div id="dSpark"></div>
        ${o.human.length ? `<button class="btn primary" type="button" id="dSwim">Voir l'échange avec François</button>` : ''}`;
      sparkline($('#dSpark'), o.curve);
      const b = $('#dSwim'); if (b) b.onclick = () => { $('#swSel').value = o.id; renderSwim(); document.getElementById('humain').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); };
      return;
    }
    const isArch = a.kind === 'archive';
    const color = MODELS[a.mk].color;
    const card = a.cardId;
    el.innerHTML = `<div class="tags"><span class="tag"><i class="dot" style="background:${color}"></i>${esc(mlabel(a.model))}</span>${a.family ? `<span class="tag">${esc(FAM[a.family])}</span>` : ''}<span class="tag">${a.kind === 'codex' ? 'Codex' : a.kind === 'archive' ? 'archivé' : 'Claude Code'}</span>${card ? `<span class="tag"><a href="${KANBAN}#${card}" target="_blank" rel="noopener">${card} sur le kanban ↗</a></span>` : ''}</div>
      <h3>${esc(a.label)}</h3>
      ${card && cardById[card] ? `<button type="button" class="btn" id="dCard" style="justify-content:flex-start;text-align:left">Carte ${esc(card)} : ${esc(cardById[card].title)}</button>` : ''}
      ${isArch ? `<p class="muted" style="font-size:.95rem">${esc(a.desc)}</p>` : `<div class="mini"><div><b>${tok(a.tokens)}</b><span>tokens traités</span></div><div><b>${eur(a.cost)}</b><span>équivalent API</span></div><div><b>${dur(a.dur)}</b><span>durée</span></div><div><b>${nf(a.tok.n)}</b><span>appels au modèle</span></div><div><b>${nf(a.acts.length)}</b><span>appels d'outils</span></div><div><b>${nf((a.prompt || '').length)}</b><span>caractères de prompt</span></div></div>`}
      <div id="dRadar"></div>
      ${isArch ? '' : '<div id="dSpark"></div>'}
      ${isArch ? '' : `<button class="btn primary" type="button" id="dPlay">▶ Rejouer cet agent</button>`}
      <details class="fold"><summary>${isArch ? 'La fiche complète' : 'Le prompt reçu'}</summary><pre>${esc(a.prompt || '(vide)')}</pre></details>
      ${a.result ? `<details class="fold"><summary>Son compte rendu</summary><pre>${esc(a.result)}</pre></details>` : ''}`;
    radar($('#dRadar'), [{ label: a.label, color, values: shapeOf(a) }], { size: 300, labels: true, compact: true });
    const dc = $('#dCard'); if (dc) dc.onclick = () => { selectCard(card); document.getElementById('cartes').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); };
    if (!isArch) {
      sparkline($('#dSpark'), a.curve);
      $('#dPlay').onclick = () => { $('#rpSel').value = a.id; loadReplay(a.id, true); document.getElementById('rejeu').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); };
    }
  }

  /* ===================== RADARS ===================== */
  const shapeOf = a => { const l = a.ev.map(v => Math.log1p(v)); const m = Math.max(...l, 0.001); return l.map(v => Math.round(v / m * 100)); };
  const volOf = a => a.skills;
  const avgVec = (list, f) => AXES.map((_, i) => Math.round(list.reduce((s, a) => s + f(a)[i], 0) / Math.max(list.length, 1)));
  const GROUPS = [
    { id: 'G-cimpl', label: 'Implémenteurs Claude', list: () => agents.filter(a => a.kind === 'claude' && (a.family === 'impl' || a.family === 'chain')) },
    { id: 'G-cctrl', label: 'Contrôleurs Claude', list: () => agents.filter(a => a.kind === 'claude' && a.family === 'ctrl') },
    { id: 'G-caudit', label: 'Auditeurs Claude', list: () => agents.filter(a => a.kind === 'claude' && a.family === 'audit') },
    { id: 'G-cpoc', label: 'Maquettes et outils', list: () => agents.filter(a => a.kind === 'claude' && (a.family === 'poc' || a.family === 'tool')) },
    { id: 'G-ximpl', label: 'Implémenteurs Codex', list: () => agents.filter(a => a.kind === 'codex' && a.family === 'impl') },
    { id: 'G-xrev', label: 'Relecteurs et audits Codex', list: () => agents.filter(a => a.kind === 'codex' && a.family !== 'impl') },
    { id: 'G-v1', label: 'Agents par couche (juin)', list: () => archived }
  ];
  const rd = { mode: 'shape', slots: ['G-cimpl', 'G-cctrl', 'ar-strates-ui'] };
  const SLOT_COLORS = ['var(--m-opus55)', 'var(--m-astra)', 'var(--m-sonnet)'];
  function vecOf(id) {
    const g = GROUPS.find(x => x.id === id);
    const f = rd.mode === 'shape' ? shapeOf : volOf;
    if (g) return { label: g.label, values: avgVec(g.list(), f), n: g.list().length };
    const a = byId[id];
    return a ? { label: a.label, values: f(a), n: 1 } : null;
  }
  function radar(el, series, opt) {
    const S = opt.size || 520, R = S * (opt.compact ? 0.25 : opt.mini ? 0.4 : 0.3), cx = S / 2, cy = S / 2 + (opt.compact ? 0 : 6);
    const n = AXES.length, ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
    const pt = (i, v) => [cx + Math.cos(ang(i)) * R * v / 100, cy + Math.sin(ang(i)) * R * v / 100];
    let s = `<svg viewBox="0 0 ${S} ${S}" role="img" aria-label="Diagramme radar des compétences">`;
    for (const lv of [25, 50, 75, 100]) s += `<polygon class="rgrid" points="${AXES.map((_, i) => pt(i, lv).join(',')).join(' ')}"/>`;
    AXES.forEach((a, i) => {
      const [x, y] = pt(i, 100); s += `<line class="raxis" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`;
      if (opt.labels !== false) { const [lx, ly] = pt(i, opt.compact ? 120 : 114); const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'; s += `<text class="rlabel" x="${lx}" y="${ly + 5}" text-anchor="${anchor}" style="font-size:${opt.compact ? 11 : 15}px">${a}</text>`; }
    });
    series.forEach(se => {
      const pts = se.values.map((v, i) => pt(i, Math.max(v, 3)));
      s += `<polygon class="rpoly" points="${pts.map(p => p.join(',')).join(' ')}" style="stroke:${se.color};fill:${se.color}"/>`;
      if (!opt.mini) pts.forEach((p, i) => { s += `<circle class="rpt" cx="${p[0]}" cy="${p[1]}" r="${opt.compact ? 3.5 : 5}" style="fill:${se.color}" data-l="${esc(se.label)}" data-a="${AXES[i]}" data-v="${se.values[i]}"/>`; });
    });
    s += `</svg>`;
    el.innerHTML = s;
    el.querySelectorAll('.rpt').forEach(c => { c.addEventListener('mousemove', ev => showTip(`<b>${esc(c.dataset.l)}</b>${row(c.dataset.a, c.dataset.v + ' / 100')}`, ev)); c.addEventListener('mouseleave', hideTip); });
  }
  function renderRadar() {
    const series = rd.slots.map((id, i) => { const v = vecOf(id); return v ? Object.assign(v, { color: SLOT_COLORS[i] }) : null; }).filter(Boolean);
    radar($('#radar'), series, { size: 560 });
    const opts = `<optgroup label="Familles">${GROUPS.map(g => `<option value="${g.id}">${esc(g.label)} (${g.list().length})</option>`).join('')}</optgroup>
      <optgroup label="Agents par couche, juin">${archived.map(a => `<option value="${a.id}">${esc(a.label)}</option>`).join('')}</optgroup>
      <optgroup label="Agents Claude">${agents.filter(a => a.kind === 'claude').map(a => `<option value="${a.id}">${esc(a.label)}</option>`).join('')}</optgroup>
      <optgroup label="Agents Codex">${agents.filter(a => a.kind === 'codex').map(a => `<option value="${a.id}">${esc(a.label)}</option>`).join('')}</optgroup>`;
    $('#slots').innerHTML = rd.slots.map((id, i) => `<div class="slot"><i class="dot" style="background:${SLOT_COLORS[i]};width:14px;height:14px"></i><select data-i="${i}" aria-label="Série ${i + 1}">${opts}</select></div>`).join('');
    document.querySelectorAll('#slots select').forEach(s => { s.value = rd.slots[+s.dataset.i]; s.onchange = () => { rd.slots[+s.dataset.i] = s.value; renderRadar(); }; });
    $('#minis').innerHTML = GROUPS.concat(archived.slice(0, 2).map(a => ({ id: a.id, label: a.label, list: () => [a] }))).map(g => `<button type="button" class="minir" data-id="${g.id}"><div class="mr"></div><b>${esc(g.label)}</b><span>${g.list().length} agent${g.list().length > 1 ? 's' : ''}</span></button>`).join('');
    document.querySelectorAll('#minis .minir').forEach(b => {
      const v = vecOf(b.dataset.id);
      radar(b.querySelector('.mr'), [{ label: v.label, color: 'var(--accent)', values: v.values }], { size: 160, labels: false, mini: true });
      b.onclick = () => { rd.slots = [b.dataset.id, rd.slots[0], rd.slots[1]]; renderRadar(); };
    });
  }
  document.querySelectorAll('#rdMode button').forEach(b => b.onclick = () => { document.querySelectorAll('#rdMode button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); rd.mode = b.dataset.v; renderRadar(); });

  /* ===================== REJEU ===================== */
  const STATIONS = [
    ['regles', 'Règles'], ['kanban', 'Kanban'], ['moteur', 'Moteur'], ['interface', 'Interface'], ['rendu', 'Rendu 3D'], ['contenu', 'Contenu'],
    ['tests', 'Tests'], ['git', 'Git'], ['terminal', 'Terminal'], ['navigateur', 'Navigateur'], ['docs', 'Docs'], ['pilote', 'Pilote'], ['autre', 'Autres']
  ];
  const KIND_COLOR = { read: 'var(--m-sol)', edit: 'var(--m-opus55)', cmd: 'var(--m-astra)', agent: 'var(--m-sonnet)', msg: 'var(--m-sonnet)', other: 'var(--muted)' };
  const KIND_LABEL = { read: 'lit', edit: 'écrit', cmd: 'exécute', msg: 'écrit au pilote', agent: 'lance un agent', other: 'autre outil' };
  const W = 820, H = 520, CX = W / 2, CY = H / 2 + 4, RX = 330, RY = 205;
  const stPos = {};
  STATIONS.forEach(([k], i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / STATIONS.length; stPos[k] = [CX + Math.cos(a) * RX, CY + Math.sin(a) * RY]; });
  const stageOf = z => z === 'message' || z === 'agent' ? 'pilote' : stPos[z] ? z : 'autre';
  const rp = { a: null, i: 0, playing: false, speed: 10, timer: 0, last: 0, pulses: [], counts: {} };
  function buildStage() {
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Rejeu animé des appels d'outils">`;
    STATIONS.forEach(([k]) => { const [x, y] = stPos[k]; s += `<line class="spoke" x1="${CX}" y1="${CY}" x2="${x}" y2="${y}"/>`; });
    s += `<g id="pulses"></g>`;
    STATIONS.forEach(([k, l]) => { const [x, y] = stPos[k]; s += `<g class="st" data-k="${k}"><circle class="bg" cx="${x}" cy="${y}" r="38"/><text class="l" x="${x}" y="${y - 4}">${l}</text><text class="n" x="${x}" y="${y + 16}">0</text></g>`; });
    s += `<g id="avatar"><circle cx="${CX}" cy="${CY}" r="58" id="avc" style="fill:var(--accent)"/><text id="avt" x="${CX}" y="${CY - 2}" text-anchor="middle" style="font-size:15px;font-weight:800;fill:#fff"></text><text id="avs" x="${CX}" y="${CY + 18}" text-anchor="middle" style="font-family:var(--f-mono);font-size:11px;fill:#fff;opacity:.85"></text></g></svg>`;
    $('#stage').innerHTML = s;
    $('#rpLegend').innerHTML = ['read', 'edit', 'cmd', 'msg'].map(k => `<span><i class="dot" style="background:${KIND_COLOR[k]}"></i>${KIND_LABEL[k]}</span>`).join('');
  }
  function loadReplay(id, autoplay) {
    const a = byId[id]; if (!a || !a.acts) return;
    rp.a = a; rp.i = 0; rp.counts = {}; rp.pulses = [];
    document.querySelectorAll('.st').forEach(g => { g.classList.remove('hot'); g.querySelector('.n').textContent = '0'; });
    $('#pulses').innerHTML = '';
    $('#avc').style.fill = MODELS[a.mk].color;
    const nm = a.label.length > 26 ? a.label.slice(0, 25) + '…' : a.label;
    $('#avt').textContent = nm; $('#avs').textContent = mlabel(a.model);
    $('#feed').innerHTML = `<div class="row" style="color:#7d84a6"><span>temps</span><span>outil</span><span>cible</span></div>`;
    $('#rpProg').style.width = '0';
    $('#rpCard').innerHTML = a.cardId ? `<a class="kanban-link" href="${KANBAN}#${a.cardId}" target="_blank" rel="noopener">Ouvrir ${a.cardId} sur le kanban ↗</a>` : '';
    setPlaying(!!autoplay);
  }
  function setPlaying(p) { rp.playing = p; $('#rpPlay').textContent = p ? '❚❚ Pause' : (rp.a && rp.i >= rp.a.acts.length ? '↻ Rejouer' : '▶ Lecture'); if (p) { rp.last = performance.now(); requestAnimationFrame(tick); } }
  function stepAction() {
    const a = rp.a, x = a.acts[rp.i]; rp.i++;
    const st = stageOf(x[2]);
    rp.counts[st] = (rp.counts[st] || 0) + 1;
    const g = document.querySelector(`.st[data-k="${st}"]`);
    g.querySelector('.n').textContent = rp.counts[st];
    g.classList.add('hot'); clearTimeout(g._t); g._t = setTimeout(() => g.classList.remove('hot'), 380);
    if (!REDUCED) {
      const [sx, sy] = stPos[st];
      const inward = x[4] === 'read';
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', 6); c.style.fill = KIND_COLOR[x[4]] || 'var(--muted)';
      $('#pulses').appendChild(c);
      rp.pulses.push({ c, x0: inward ? sx : CX, y0: inward ? sy : CY, x1: inward ? CX : sx, y1: inward ? CY : sy, t0: performance.now(), d: Math.max(260, 900 - rp.speed * 14) });
    }
    const feed = $('#feed');
    const rowEl = document.createElement('div'); rowEl.className = 'row new';
    const t = x[0] || 0;
    rowEl.innerHTML = `<span>${String(Math.floor(t / 60)).padStart(3, ' ')}:${String(t % 60).padStart(2, '0')}</span><b style="color:${KIND_COLOR[x[4]] || '#9aa0bd'}">${esc(x[1])}</b><span title="${esc(x[3])}">${esc(x[3] || STATIONS.find(s => s[0] === st)[1])}</span>`;
    feed.insertBefore(rowEl, feed.children[1] || null);
    while (feed.children.length > 22) feed.removeChild(feed.lastChild);
    $('#rpProg').style.width = (rp.i / a.acts.length * 100) + '%';
  }
  function tick(now) {
    if (rp.playing && rp.a) {
      const every = 1000 / rp.speed;
      while (now - rp.last >= every && rp.i < rp.a.acts.length) { stepAction(); rp.last += every; }
      if (rp.i >= rp.a.acts.length) setPlaying(false);
    }
    rp.pulses = rp.pulses.filter(p => {
      const k = Math.min(1, (now - p.t0) / p.d);
      p.c.setAttribute('cx', p.x0 + (p.x1 - p.x0) * k); p.c.setAttribute('cy', p.y0 + (p.y1 - p.y0) * k);
      p.c.style.opacity = String(1 - k * 0.5);
      if (k >= 1) { p.c.remove(); return false; }
      return true;
    });
    if (rp.playing || rp.pulses.length) requestAnimationFrame(tick);
  }
  function renderReplayControls() {
    const grp = (label, list) => `<optgroup label="${esc(label)}">${list.map(a => `<option value="${a.id}">${esc(a.label)} · ${a.acts.length} appels</option>`).join('')}</optgroup>`;
    $('#rpSel').innerHTML = grp('Claude, sous-agents', agents.filter(a => a.kind === 'claude')) + grp('Codex', agents.filter(a => a.kind === 'codex'));
    $('#rpSel').onchange = e => loadReplay(e.target.value, true);
    $('#rpPlay').onclick = () => { if (!rp.a) return; if (rp.i >= rp.a.acts.length) loadReplay(rp.a.id, true); else setPlaying(!rp.playing); };
    document.querySelectorAll('#rpSpeed button').forEach(b => b.onclick = () => { document.querySelectorAll('#rpSpeed button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); rp.speed = +b.dataset.v; });
    const def = agents.find(a => /Contrôler la livraison BUG-14/.test(a.label)) || agents[0];
    $('#rpSel').value = def.id; loadReplay(def.id, false);
  }

  /* ===================== AVEC L'HUMAIN ===================== */
  const MSG_CATS = {
    idee: { label: 'Idée ou demande', color: 'var(--m-opus55)' },
    retour: { label: 'Retour de test', color: 'var(--m-astra)' },
    question: { label: 'Question, suivi', color: 'var(--m-sol)' },
    valid: { label: 'Validation, go', color: 'var(--m-sonnet)' },
    relais: { label: "Relais d'un agent", color: 'var(--m-fable)' }
  };
  function msgCat(t) {
    const x = t.toLowerCase();
    if (/^\**\s*(bug|evo|mig)-\d+/.test(x) && /(livr|commit|prête|commité|branche)/.test(x) || (t.length > 300 && /commit [0-9a-f]{7}/.test(x))) return 'relais';
    if (/^(ok|oui|go|vas-y|vas y|valid|parfait|top|super|merci|c'est bon|push|merge|ça marche|nickel)/.test(x) || /\b(je valide|tu peux push|push|merge)\b/.test(x) && t.length < 120) return 'valid';
    if (/joueur|testé|tester|plante|marche pas|ne fonctionne|j'ai vu|bug|bloqu|retour|on peut placer|pas intuitif/.test(x)) return 'retour';
    if (/\?\s*$/.test(t.trim()) || /^(où|est ce|est-ce|ça avance|comment|pourquoi|pk)/.test(x)) return 'question';
    return 'idee';
  }
  const swOrchs = orchs.filter(o => o.human.length >= 10);
  const sw = { id: CUR, day: null };
  function renderSwim() {
    sw.id = $('#swSel').value || CUR;
    const o = byId[sw.id];
    const t0 = Date.parse(o.start), t1 = Date.parse(o.end);
    const days = [];
    for (let t = t0; t <= t1 + 864e5; t += 864e5) { const d = new Date(t).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); if (!days.includes(d) && Date.parse(d + 'T00:00:00+02:00') <= t1) days.push(d); }
    if (sw.day && !days.includes(sw.day)) sw.day = null;
    $('#swDays').innerHTML = `<button type="button" data-d="" aria-pressed="${!sw.day}">Tout</button>` + days.map(d => `<button type="button" data-d="${d}" aria-pressed="${sw.day === d}">${dshort(d + 'T12:00:00Z')}</button>`).join('');
    document.querySelectorAll('#swDays button').forEach(b => b.onclick = () => { sw.day = b.dataset.d || null; renderSwim(); });
    let dom = [t0, t1];
    if (sw.day) dom = [Date.parse(sw.day + 'T00:00:00+02:00'), Date.parse(sw.day + 'T23:59:59+02:00')];
    const msgs = o.human.map(([ts, t]) => ({ ts: Date.parse(ts), t, c: msgCat(t) })).filter(m => m.ts >= dom[0] && m.ts <= dom[1]);
    const kids = agents.filter(a => a.parent === o.id || (o.kind === 'claude' && false)).filter(a => Date.parse(a.end) >= dom[0] && Date.parse(a.start) <= dom[1]);
    const pacts = (o.acts || []).map(x => ({ ts: t0 + x[0] * 1000, tool: x[1], zone: x[2], label: x[3], kind: x[4] })).filter(x => x.ts >= dom[0] && x.ts <= dom[1]).map(x => {
      let k = null;
      if (x.kind === 'agent') k = 'agent'; else if (x.kind === 'msg') k = 'msg';
      else if (x.zone === 'git' && /\bgit\b[^|]*\b(merge|cherry-pick)\b/.test(x.label)) k = 'merge';
      else if (x.zone === 'git' && /\bpush\b/.test(x.label)) k = 'push';
      else if (x.zone === 'kanban' && x.kind !== 'read') k = 'carte';
      return Object.assign(x, { k });
    }).filter(x => x.k);
    const Wd = 1300, laneH = 74, rowH = 15;
    const rows = []; const placed = kids.sort((a, b) => a.start.localeCompare(b.start)).map(a => { const s = Date.parse(a.start), e = Date.parse(a.end); let r = rows.findIndex(end => end < s - 6e4); if (r < 0) { r = rows.length; rows.push(0); } rows[r] = e; return { a, s, e, r }; });
    const agentH = Math.max(40, rows.length * rowH + 16);
    const top = 30, ml = 110, mr = 20;
    const Hh = top + laneH * 2 + agentH + 34;
    const x = d3.scaleTime().domain(dom).range([ml, Wd - mr]);
    const yF = top + laneH / 2, yP = top + laneH * 1.5, yA = top + laneH * 2 + 8;
    const PSH = { agent: 'triangle', carte: 'square', merge: 'circle', push: 'star', msg: 'diamond' };
    const PLB = { agent: 'lance un agent', carte: 'touche au kanban', merge: 'merge', push: 'push', msg: 'message' };
    const sym = k => d3.symbol().type({ triangle: d3.symbolTriangle, square: d3.symbolSquare, circle: d3.symbolCircle, star: d3.symbolStar, diamond: d3.symbolDiamond }[PSH[k]]).size(k === 'agent' ? 110 : 70)();
    let s = `<svg viewBox="0 0 ${Wd} ${Hh}" role="img" aria-label="Frise des échanges entre François, l'orchestrateur et les agents">`;
    [['François', top], ['Orchestrateur', top + laneH], ['Agents', top + laneH * 2]].forEach(([l, y], i) => { s += `<rect class="lane-bg" x="0" y="${y}" width="${Wd}" height="${i === 2 ? agentH : laneH - 6}" rx="8"/><text class="lane-label" x="12" y="${y + 22}">${l}</text>`; });
    s += `<g class="axis" transform="translate(0,${Hh - 22})"></g>`;
    msgs.forEach((m, i) => { s += `<circle class="hm" data-i="${i}" cx="${x(m.ts)}" cy="${yF + (i % 3 - 1) * 9}" r="7" style="fill:${MSG_CATS[m.c].color};stroke:var(--card);stroke-width:1.5;cursor:help"/>`; });
    pacts.forEach((p, i) => { s += `<path class="pa" data-i="${i}" transform="translate(${x(p.ts)},${yP + (p.k === 'agent' ? 0 : p.k === 'carte' ? -14 : 14)})" d="${sym(p.k)}" style="fill:${p.k === 'agent' ? 'var(--accent)' : 'var(--text)'};opacity:.85;cursor:help"/>`; });
    placed.forEach((p, i) => { const x0 = x(Math.max(p.s, dom[0])), x1 = Math.max(x(Math.min(p.e, dom[1])), x0 + 4); s += `<rect class="ab" data-i="${i}" x="${x0}" y="${yA + p.r * rowH}" width="${x1 - x0}" height="${rowH - 4}" rx="3" style="fill:${MODELS[p.a.mk].color};cursor:pointer"/>`; });
    s += `</svg>`;
    $('#swim').innerHTML = s;
    const svgEl = d3.select('#swim svg');
    svgEl.select('.axis').call(d3.axisBottom(x).ticks(sw.day ? 12 : 8).tickFormat(d => sw.day ? d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }) : d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', hour: '2-digit' }) + ' h'));
    document.querySelectorAll('#swim .hm').forEach(c => { const m = msgs[+c.dataset.i]; c.addEventListener('mousemove', ev => showTip(`<b>${esc(MSG_CATS[m.c].label)}</b><div class="muted" style="color:#8a8ea3">${dtime(new Date(m.ts).toISOString())}</div><div class="q">« ${esc(m.t.length > 150 ? m.t.slice(0, 150) + '…' : m.t)} »</div>`, ev)); c.addEventListener('mouseleave', hideTip); });
    document.querySelectorAll('#swim .pa').forEach(c => { const p = pacts[+c.dataset.i]; c.addEventListener('mousemove', ev => showTip(`<b>${esc(PLB[p.k])}</b><div class="q">${esc(p.label)}</div>`, ev)); c.addEventListener('mouseleave', hideTip); });
    document.querySelectorAll('#swim .ab').forEach(c => { const p = placed[+c.dataset.i]; c.addEventListener('mousemove', ev => showTip(`<b>${esc(p.a.label)}</b>${row('Modèle', mlabel(p.a.model))}${row('Durée', dur(p.a.dur))}${row('Tokens', tok(p.a.tokens))}<div class="muted" style="color:#8a8ea3;margin-top:4px">Clic : ouvrir sa fiche</div>`, ev)); c.addEventListener('mouseleave', hideTip); c.addEventListener('click', () => { selId = p.a.id; expandTo(p.a); showDrawer(p.a); document.getElementById('arbre').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); }); });
    const cnt = {}; msgs.forEach(m => cnt[m.c] = (cnt[m.c] || 0) + 1);
    $('#swStats').innerHTML = `<span><b>${msgs.length}</b> messages de François</span><span><b>${pacts.filter(p => p.k === 'agent').length}</b> agents lancés</span><span><b>${pacts.filter(p => p.k === 'carte').length}</b> passages par le kanban</span><span><b>${pacts.filter(p => p.k === 'merge').length}</b> merges</span><span><b>${pacts.filter(p => p.k === 'push').length}</b> push</span>`;
    $('#swLegend').innerHTML = Object.entries(MSG_CATS).map(([k, c]) => `<span><i class="dot" style="background:${c.color}"></i>${c.label} <b class="mono">${cnt[k] || 0}</b></span>`).join('') + Object.entries(PLB).map(([k, l]) => `<span><svg width="14" height="14" viewBox="-7 -7 14 14"><path d="${sym(k)}" style="fill:${k === 'agent' ? 'var(--accent)' : 'var(--text)'}" transform="scale(.8)"/></svg>${l}</span>`).join('');
  }
  function expandTo(a) {
    if (a.kind === 'claude') { expanded.add('g-claude'); expanded.add(a.parent); expanded.add(a.parent + '|f|' + a.family); }
    else if (a.kind === 'codex') { expanded.add('g-codex'); expanded.add(a.parent); }
    render(a.id);
  }
  function renderSwimControls() {
    $('#swSel').innerHTML = swOrchs.map(o => `<option value="${o.id}">${esc(orchLabel(o))} · ${o.human.length} messages</option>`).join('');
    $('#swSel').value = CUR;
    $('#swSel').onchange = () => { sw.day = null; renderSwim(); };
  }

  /* ===================== COURBES ===================== */
  const cv = { metric: 'tok' };
  const LINE_MODELS = ['gpt-6-astra', 'gpt-6-sol', 'gpt-6.1-sol', 'claude-opus-5', 'claude-sonnet-5', 'claude-opus-5-5'];
  const LM_COLOR = { 'gpt-6-astra': 'var(--m-astra)', 'gpt-6-sol': 'var(--m-sol)', 'gpt-6.1-sol': 'var(--m-sol)', 'claude-opus-5': 'var(--m-opus5)', 'claude-sonnet-5': 'var(--m-sonnet)', 'claude-opus-5-5': 'var(--m-opus55)' };
  function dailySeries() {
    const days = [];
    const first = D.daily[0].day, last = D.daily[D.daily.length - 1].day;
    for (let t = Date.parse(first + 'T12:00:00Z'); t <= Date.parse(last + 'T12:00:00Z'); t += 864e5) days.push(new Date(t).toISOString().slice(0, 10));
    const models = ['gpt-6-astra', 'gpt-6-sol', 'claude-opus-5', 'claude-sonnet-5', 'claude-opus-5-5'];
    const rows = days.map(d => { const r = { day: d, date: new Date(d + 'T12:00:00Z') }; models.forEach(m => r[m] = 0); return r; });
    for (const x of D.daily) {
      const r = rows.find(r => r.day === x.day); const m = x.model === 'gpt-6.1-sol' ? 'gpt-6-sol' : x.model;
      r[m] += cv.metric === 'eur' ? costOf(x, x.model) : tokOf(x);
    }
    return { rows, models };
  }
  function renderArea() {
    const { rows, models } = dailySeries();
    const Wc = 760, Hc = 340, m = { l: 62, r: 14, t: 10, b: 28 };
    const x = d3.scaleTime().domain(d3.extent(rows, r => r.date)).range([m.l, Wc - m.r]);
    const stack = d3.stack().keys(models)(rows);
    const y = d3.scaleLinear().domain([0, d3.max(stack[stack.length - 1], d => d[1]) || 1]).nice().range([Hc - m.b, m.t]);
    const area = d3.area().x(d => x(d.data.date)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveMonotoneX);
    const fmtY = cv.metric === 'eur' ? v => eur(v, 0) : v => tok(v);
    const svgc = d3.create('svg').attr('viewBox', `0 0 ${Wc} ${Hc}`).attr('role', 'img').attr('aria-label', 'Consommation par jour et par modèle');
    svgc.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(Wc - m.l - m.r)).tickFormat(fmtY)).call(g => g.select('.domain').remove());
    svgc.append('g').attr('transform', `translate(0,${Hc - m.b})`).call(d3.axisBottom(x).ticks(8).tickFormat(d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }))).call(g => g.select('.domain').attr('stroke', 'var(--line)')).call(g => g.selectAll('line').attr('stroke', 'var(--line)'));
    svgc.append('g').selectAll('path').data(stack).join('path').attr('d', area).style('fill', d => LM_COLOR[d.key]).style('fill-opacity', 0.85).style('stroke', 'var(--card)').style('stroke-width', 1.5);
    const cross = svgc.append('line').attr('class', 'cross').attr('y1', m.t).attr('y2', Hc - m.b).style('opacity', 0);
    svgc.append('rect').attr('x', m.l).attr('y', m.t).attr('width', Wc - m.l - m.r).attr('height', Hc - m.t - m.b).style('fill', 'transparent')
      .on('mousemove', function (ev) {
        const [px] = d3.pointer(ev, this); const d = x.invert(px);
        const r = rows.reduce((b, c) => Math.abs(c.date - d) < Math.abs(b.date - d) ? c : b);
        cross.attr('x1', x(r.date)).attr('x2', x(r.date)).style('opacity', 1);
        showTip(`<b>${r.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</b>` + models.slice().reverse().filter(k => r[k] > 0).map(k => row(mlabel(k), fmtY(r[k]), LM_COLOR[k])).join('') + (models.every(k => !r[k]) ? '<div class="q">Aucune session ce jour-là</div>' : ''), ev);
      }).on('mouseleave', () => { cross.style('opacity', 0); hideTip(); });
    $('#cvArea').innerHTML = ''; $('#cvArea').appendChild(svgc.node());
    $('#cvLegend').innerHTML = models.slice().reverse().map(k => `<span><i class="dot" style="background:${LM_COLOR[k]}"></i>${mlabel(k)}</span>`).join('');
    const lines = [{ k: 'Claude', f: mm => /claude/.test(mm), c: 'var(--m-opus55)' }, { k: 'Codex', f: mm => /gpt/.test(mm), c: 'var(--m-astra)' }];
    const cum = lines.map(l => { let acc = 0; return { l, pts: rows.map(r => { acc += models.filter(l.f).reduce((s, k) => s + r[k], 0); return [r.date, acc]; }) }; });
    const Wc2 = 520, Hc2 = 340;
    const x2 = d3.scaleTime().domain(d3.extent(rows, r => r.date)).range([m.l, Wc2 - 64]);
    const y2 = d3.scaleLinear().domain([0, d3.max(cum, c => c.pts[c.pts.length - 1][1]) || 1]).nice().range([Hc2 - m.b, m.t]);
    const s2 = d3.create('svg').attr('viewBox', `0 0 ${Wc2} ${Hc2}`).attr('role', 'img').attr('aria-label', 'Cumul par famille de modèles');
    s2.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y2).ticks(5).tickSize(-(Wc2 - m.l - 64)).tickFormat(fmtY)).call(g => g.select('.domain').remove());
    s2.append('g').attr('transform', `translate(0,${Hc2 - m.b})`).call(d3.axisBottom(x2).ticks(5).tickFormat(d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }))).call(g => g.selectAll('line,.domain').attr('stroke', 'var(--line)'));
    const ln = d3.line().x(p => x2(p[0])).y(p => y2(p[1])).curve(d3.curveMonotoneX);
    cum.forEach(c => {
      const p = s2.append('path').attr('d', ln(c.pts)).style('fill', 'none').style('stroke', c.l.c).style('stroke-width', 3);
      const lastP = c.pts[c.pts.length - 1];
      s2.append('circle').attr('cx', x2(lastP[0])).attr('cy', y2(lastP[1])).attr('r', 5).style('fill', c.l.c).style('stroke', 'var(--card)').style('stroke-width', 2);
      s2.append('text').attr('x', x2(lastP[0]) + 9).attr('y', y2(lastP[1]) + 4).style('fill', 'var(--text)').style('font-weight', 700).text(fmtY(lastP[1]));
      if (!REDUCED) { const L = p.node().getTotalLength ? 2000 : 0; p.attr('stroke-dasharray', L).attr('stroke-dashoffset', L).transition().duration(1400).attr('stroke-dashoffset', 0); }
    });
    $('#cvCum').innerHTML = ''; $('#cvCum').appendChild(s2.node());
    $('#cumLegend').innerHTML = lines.map(l => `<span><i class="dot" style="background:${l.c}"></i>${l.k}</span>`).join('');
  }
  document.querySelectorAll('#cvMetric button').forEach(b => b.onclick = () => { document.querySelectorAll('#cvMetric button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); cv.metric = b.dataset.v; renderArea(); });
  function renderCtx() {
    const a = byId[$('#ctxSel').value] || agents[0];
    const c = a.curve;
    const Wc = 1300, Hc = 300, m = { l: 66, r: 20, t: 12, b: 30 };
    const x = d3.scaleLinear().domain([0, d3.max(c, d => d[0]) / 60 || 1]).range([m.l, Wc - m.r]);
    const y = d3.scaleLinear().domain([0, d3.max(c, d => d[1]) || 1]).nice().range([Hc - m.b, m.t]);
    const s = d3.create('svg').attr('viewBox', `0 0 ${Wc} ${Hc}`).attr('role', 'img').attr('aria-label', 'Taille du contexte au fil des appels');
    s.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(Wc - m.l - m.r)).tickFormat(v => tok(v))).call(g => g.select('.domain').remove());
    s.append('g').attr('transform', `translate(0,${Hc - m.b})`).call(d3.axisBottom(x).ticks(10).tickFormat(v => v + ' min')).call(g => g.selectAll('line,.domain').attr('stroke', 'var(--line)'));
    const area = d3.area().x(d => x(d[0] / 60)).y0(Hc - m.b).y1(d => y(d[1])).curve(d3.curveStepAfter);
    const line = d3.line().x(d => x(d[0] / 60)).y(d => y(d[1])).curve(d3.curveStepAfter);
    s.append('path').attr('d', area(c)).style('fill', MODELS[a.mk].color).style('opacity', 0.16);
    const p = s.append('path').attr('d', line(c)).style('fill', 'none').style('stroke', MODELS[a.mk].color).style('stroke-width', 2.5);
    if (!REDUCED) p.attr('stroke-dasharray', 6000).attr('stroke-dashoffset', 6000).transition().duration(1600).ease(d3.easeCubicOut).attr('stroke-dashoffset', 0);
    $('#ctxChart').innerHTML = ''; $('#ctxChart').appendChild(s.node());
    const ctxMax = d3.max(c, d => d[1]);
    $('#ctxNote').innerHTML = `Chaque appel renvoie tout le contexte. Ici, le contexte culmine à <b class="mono">${tok(ctxMax)}</b>, mais l'agent a fait traiter <b class="mono">${tok(a.tokens)}</b> tokens en tout, soit <b class="mono">${nf(a.tokens / ctxMax, 0)} fois</b> plus.`;
  }
  function renderCtxControls() {
    const list = agents.slice().sort((p, q) => q.tokens - p.tokens);
    $('#ctxSel').innerHTML = list.map(a => `<option value="${a.id}">${esc(a.label)} · ${tok(a.tokens)}</option>`).join('');
    const def = agents.find(a => /Implémenter BUG-18/.test(a.label)) || list[0];
    $('#ctxSel').value = def.id;
    $('#ctxSel').onchange = renderCtx;
  }

  /* ===================== MUR DE CARTES ===================== */
  const TYPES = { BUG: { label: 'Bugs', color: 'var(--m-fable)' }, EVO: { label: 'Évolutions', color: 'var(--m-opus55)' }, MIG: { label: 'Migrations v1', color: 'var(--m-sonnet)' }, AUTRE: { label: 'Hors carte', color: 'var(--muted)' } };
  const wl = { types: new Set(Object.keys(TYPES)), size: 'usd', sel: null };
  const agentsOfCard = id => agents.filter(a => a.cardId === id);
  const sizeOf = c => wl.size === 'usd' ? c.usd : wl.size === 'min' ? c.min : c.added + c.removed;
  let wallLeaves = [];
  function renderWall() {
    $('#wallTypes').innerHTML = Object.entries(TYPES).map(([k, ty]) => '<button type="button" class="chip" data-k="' + k + '" aria-pressed="' + wl.types.has(k) + '"><i class="dot" style="background:' + ty.color + '"></i>' + ty.label + ' <span class="mono muted">' + CARDS.filter(c => c.type === k).length + '</span></button>').join('');
    document.querySelectorAll('#wallTypes .chip').forEach(b => b.onclick = () => { const k = b.dataset.k; if (wl.types.has(k) && wl.types.size > 1) wl.types.delete(k); else wl.types.add(k); renderWall(); });
    const list = CARDS.filter(c => wl.types.has(c.type) && sizeOf(c) > 0);
    const Wd = 900, Hd = 640;
    const root = d3.pack().size([Wd, Hd]).padding(3)(d3.hierarchy({ children: list }).sum(c => c.id ? Math.max(sizeOf(c), 0.0001) : 0));
    wallLeaves = root.leaves();
    let s = '<svg viewBox="0 0 ' + Wd + ' ' + Hd + '" role="img" aria-label="Les cartes du kanban">';
    wallLeaves.forEach((n, i) => {
      const c = n.data;
      const label = n.r > 17 ? '<text dy="0.35em" style="font-size:' + Math.min(13, n.r / 2.6) + 'px">' + esc(c.id.length > 9 ? c.id.slice(0, 8) : c.id) + '</text>' : '';
      s += '<g class="bub' + (wl.sel === c.id ? ' on' : '') + '" data-i="' + i + '" transform="translate(' + n.x + ',' + n.y + ')" tabindex="0" role="button" aria-label="' + esc(c.id + ' ' + c.title) + '"><circle r="' + n.r + '" style="fill:' + TYPES[c.type].color + ';fill-opacity:' + (c.status === 'done' ? 1 : 0.62) + '"/>' + label + '</g>';
    });
    s += '</svg>';
    $('#wall').innerHTML = s;
    document.querySelectorAll('#wall .bub').forEach(g => {
      const c = wallLeaves[+g.dataset.i].data;
      g.addEventListener('mousemove', ev => showTip('<b>' + esc(c.id) + '</b> <span style="color:#8a8ea3">' + esc(STATUS[c.status] || c.status) + '</span><div class="q">' + esc(c.title) + '</div>' + row('Coût', eur(c.usd * RATE)) + (c.min ? row("Temps de l'agent de code", dur(c.min * 60)) : '') + (c.commits ? row('Commits', nf(c.commits)) : '') + (c.added ? row('Lignes', '+' + nf(c.added) + ' / -' + nf(c.removed)) : ''), ev));
      g.addEventListener('mouseleave', hideTip);
      g.addEventListener('click', () => selectCard(c.id));
      g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectCard(c.id); } });
    });
    if (!wl.sel) { const top = CARDS.filter(c => /^(BUG|EVO|MIG)/.test(c.id)).sort((a, b) => b.usd - a.usd)[0]; if (top) selectCard(top.id); } else selectCard(wl.sel);
  }
  function selectCard(id) {
    const c = cardById[id]; if (!c) return;
    wl.sel = id;
    document.querySelectorAll('#wall .bub').forEach(g => g.classList.toggle('on', wallLeaves[+g.dataset.i] && wallLeaves[+g.dataset.i].data.id === id));
    const ag = agentsOfCard(id);
    const models = Object.entries(c.by).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const totM = models.reduce((s, m) => s + m[1], 0) || 1;
    const isCard = /^(BUG|EVO|MIG)/.test(id);
    let h = '<div class="tags"><span class="tag"><i class="dot" style="background:' + TYPES[c.type].color + '"></i>' + esc(TYPES[c.type].label) + '</span><span class="tag">' + esc(STATUS[c.status] || c.status) + '</span>' + (c.merged ? '<span class="tag">mergée dans main</span>' : '') + '</div>';
    h += '<h3>' + esc(id) + ' · ' + esc(c.title) + '</h3>';
    h += '<div class="mini"><div><b>' + eur(c.usd * RATE) + '</b><span>équivalent API</span></div><div><b>' + (c.min ? dur(c.min * 60) : '·') + '</b><span>temps de l\'agent</span></div><div><b>' + nf(c.commits) + '</b><span>commits</span></div></div>';
    if (models.length) {
      h += '<div class="stack">' + models.map(([k, v]) => '<i style="flex:' + v + ';background:' + MODELS[mkey(k)].color + '" title="' + esc(mlabel(k)) + '"></i>').join('') + '</div>';
      h += '<div class="legend">' + models.map(([k, v]) => '<span><i class="dot" style="background:' + MODELS[mkey(k)].color + '"></i>' + esc(mlabel(k)) + ' ' + nf(v / totM * 100, 0) + ' %</span>').join('') + '</div>';
    }
    if (isCard) h += '<a class="btn primary" href="' + KANBAN + '#' + id + '" target="_blank" rel="noopener">Ouvrir la carte sur le kanban ↗</a>';
    h += '<div><div class="eyebrow" style="margin-bottom:8px">Agents sur cette carte</div><div class="agent-links">' + (ag.length ? ag.map(a => '<button type="button" data-id="' + a.id + '"><i class="dot" style="background:' + MODELS[a.mk].color + '"></i>' + esc(a.label) + '</button>').join('') : '<p class="empty">Aucun sous-agent nommé pour cette carte : elle a été traitée dans une session directe ou une file de cartes enchaînées.</p>') + '</div></div>';
    $('#cardPanel').innerHTML = h;
    document.querySelectorAll('#cardPanel .agent-links button').forEach(b => b.onclick = () => { const a = byId[b.dataset.id]; selId = a.id; expandTo(a); showDrawer(a); document.getElementById('arbre').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); });
  }
  document.querySelectorAll('#wallSize button').forEach(b => b.onclick = () => { document.querySelectorAll('#wallSize button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); wl.size = b.dataset.v; renderWall(); });

  function renderMethod() {
    const M = [
      "Sources : les journaux locaux de Claude Code (5 sessions de pilote et leurs sous-agents) et de Codex (" + orchs.filter(o => o.kind === 'codex').length + " fils orchestrateurs et " + agents.filter(a => a.kind === 'codex').length + " sessions ou sous-agents), plus les 9 fiches d'agents archivées en juin. Chaque appel y est enregistré avec ses compteurs de tokens.",
      "Tokens traités : entrée, écriture et lecture de cache, sortie, sommés sur tous les appels. Le chiffre de l'Agent map de VSCode est la taille du contexte au dernier appel, pas ce volume.",
      "Équivalent API : tarifs publics au 3 octobre 2026, en dollars par million (Opus 5.5 : 4 / 0,20 / 20 ; Opus 5 : 5 / 0,50 / 25 ; Sonnet 5 : 2 / 0,20 / 10 ; GPT-6 Astra : 10 / 1 / 50 ; GPT-6 Sol : 2 / 0,20 / 10), convertis au taux BCE du 2 octobre (0,8909 € pour 1 $). Ce qui est réellement payé dépend de la formule d'abonnement.",
      "Compétences : score calculé, pas déclaré. Fichiers modifiés par zone du jeu (interface, moteur, rendu, contenu, tests, kanban), commandes lancées (tests, git, navigateur), part de lecture seule, et mots clés du prompt. Profil : la forme propre à l'agent. Volume : comparé à tous les autres.",
      "Messages de François : classés automatiquement par mots clés, extraits tronqués. Les prénoms des personnages, qui sont ceux de personnes réelles, sont masqués partout.",
      "Cartes : coûts, temps et lignes de code repris du tableau de bord du kanban (généré le 3 octobre), qui rattache chaque session de travail à une carte d'après les branches et les messages. Ordres de grandeur par carte, totaux fiables.",
      "Les agents archivés de juin n'ont pas de journal d'usage : seuls leur fiche, leur modèle déclaré et leurs outils autorisés sont connus."
    ];
    $('#method').innerHTML = M.map(t => `<li>${esc(t)}</li>`).join('');
  }

  renderCounters();
  renderTreeChips();
  render();
  fit();
  selId = (agents.find(a => /Contrôler la livraison BUG-14/.test(a.label)) || {}).id;
  showDrawer(byId[selId]);
  render();
  buildStage();
  renderReplayControls();
  renderRadar();
  renderWall();
  renderSwimControls();
  renderSwim();
  renderArea();
  renderCtxControls();
  renderCtx();
  renderMethod();
})();
