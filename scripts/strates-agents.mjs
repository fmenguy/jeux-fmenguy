import fs from 'node:fs';
import path from 'node:path';

import os from 'node:os';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const HOME = os.homedir();
const STRATES = arg('strates', 'D:/git/strates-fmenguy');
const CLAUDE = arg('claude', path.join(HOME, '.claude/projects/d--git-strates-fmenguy'));
const CODEX = arg('codex', path.join(HOME, '.codex/sessions'));
const ARCH = path.join(STRATES, '.claude/archive/agents-par-couche-20260921');
const OUT = arg('out', path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/strates-agents'));

const NAMES = ['Frédéric', 'Chloé', 'Julien', 'Victoire', 'Thomas', 'Omar', 'Léopold'];
const clean = (s, max) => {
  let t = String(s || '');
  for (const n of NAMES) t = t.split(n).join('[prénom]');
  t = t.replace(/[A-Za-z]:[\\/]+Users[\\/]+(Fran\S*?|FRANOI~1)(?=[\\/])/gi, '~').replace(/\/[a-z]\/Users\/(Fran\S*?|FRANOI~1)(?=\/)/gi, '~').replace(/^cd\s+\S+\s*&&\s*/, '').replace(/[\u2014\u2013]/g, ',').replace(/\r/g, '');
  return max && t.length > max ? t.slice(0, max) + ' […]' : t;
};
const readJsonl = f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const textOf = c => typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b.type === 'text' || b.type === 'input_text').map(b => b.text).join('\n') : '';
const day = ts => (ts || '').slice(0, 10);

function zoneOf(s, isCmd) {
  const x = String(s || '');
  if (isCmd) {
    if (/playwright|chromium|screenshot|captur/i.test(x)) return 'navigateur';
    if (/node --test|npm test|npm run test|node\s+--test/.test(x)) return 'tests';
    if (/^\s*git\b|git -C|\bgit (log|diff|show|status|branch|checkout|switch|commit|merge|add|archive|rev-parse|cherry-pick|push|reset|stash|worktree|tag)\b/.test(x)) return 'git';
    if (/content:check|research:measure/.test(x)) return 'contenu';
    if (/cache:stamp|node --check/.test(x)) return 'terminal';
  }
  if (/AGENTS\.md|CLAUDE\.md|\.claude[\/\\]kb/.test(x)) return 'regles';
  if (/cards-data\.js|SUIVI\.md|kanban\.|retours[\/\\]v2-|PROGRESSION\.md/.test(x)) return 'kanban';
  if (/[\/\\]tests?[\/\\]|\.test\.m?js/.test(x)) return 'tests';
  if (/content[\/\\][\w-]+\.json|editor[\/\\]data|-data\.js|content-(loader|transform)|catalog/.test(x)) return 'contenu';
  if (/world\.js|visuals\.js|scene|terrain|render-motion|three|vendor[\/\\]|citizen-(appearance|outfits|tool-pose)|camera|coast-palette|weather\.js|graphics-quality|ambience\.js/.test(x)) return 'rendu';
  if (/\.css\b|\.html\b|ui\.js|-view\.js|landing|help\.js|tutorial|hud|research-atlas|research-wheel|icons\.js|interface|tips\.js|panel/.test(x)) return 'interface';
  if (/v2[\/\\][\w-]+\.js/.test(x)) return 'moteur';
  if (/v2[\/\\][\w-]+\.md|docs[\/\\]|README/.test(x)) return 'docs';
  return isCmd ? 'terminal' : 'autre';
}
function cmdFamily(c) {
  const x = String(c || '').trim();
  const g = x.match(/\bgit(?:\s+-C\s+\S+)?\s+([a-z-]+)/);
  if (g) return 'git ' + g[1];
  if (/node --test|node\s+--test/.test(x)) return 'node --test';
  if (/npm test|npm run test/.test(x)) return 'npm test';
  if (/node --check/.test(x)) return 'node --check';
  if (/cache:stamp/.test(x)) return 'npm run cache:stamp';
  if (/content:check/.test(x)) return 'npm run content:check';
  if (/playwright|chromium|screenshot|captur/i.test(x)) return 'Chromium sans fenêtre';
  if (/^(rg|grep|Select-String)\b/.test(x)) return 'recherche (rg)';
  if (/^(Get-Content|cat|sed|head|tail|type)\b/.test(x)) return 'lecture de fichier';
  if (/^(ls|dir|Get-ChildItem|find|tree)\b/.test(x)) return 'liste de fichiers';
  if (/^node\b/.test(x)) return 'script node';
  if (/^npm\b/.test(x)) return 'npm';
  return 'autre commande';
}

const KW = {
  ui: /panneau|bouton|\bcss\b|feuille de style|modale|interface|design system|typograph|icône|libellé|menu|dock|fiche/gi,
  ux: /joueur|ergonom|lisib|parcours|clic|clavier|focus|survol|accessib|1366|2560|compréhens|tutoriel|visite guidée|intuitif/gi,
  back: /moteur|\btick\b|sélecteur|sauvegarde|pathfinding|simulation|engine|commande|économie|production|état du jeu/gi,
  front: /three|rendu|scène|caméra|mesh|animation|voxel|décor|lumière|modèle 3d|sprite|marteau/gi,
  data: /\bjson\b|contenu|catalogue|données|bâtiment|métier|savoir|ressource|technologie|recette/gi,
  tests: /\btests?\b|non régression|suite complète|npm test|node --test|vert/gi,
  review: /contrôl|audit|verdict|relis|relecture|vérifi|mergeable|rapport|lecture seule|incohéren/gi,
  cards: /\bcarte\b|\bcartes\b|kanban|critères|SUIVI|cards-data/gi,
};
const kwCount = (txt, re) => (String(txt).match(re) || []).length;

function evidence(actions, prompt) {
  const e = { ui: 0, ux: 0, back: 0, front: 0, data: 0, tests: 0, review: 0, cards: 0 };
  let edits = 0, reads = 0;
  for (const a of actions) {
    const [, tool, zone, label, kind] = a;
    const w = kind === 'edit' ? 3 : kind === 'read' ? 0.5 : 1;
    if (kind === 'edit') edits++; else if (kind === 'read') reads++;
    if (zone === 'interface') { e.ui += w; e.front += kind === 'edit' ? 1 : 0; }
    if (zone === 'moteur') e.back += w;
    if (zone === 'rendu') e.front += w;
    if (zone === 'contenu') e.data += kind === 'cmd' ? 2 : w;
    if (zone === 'tests') e.tests += kind === 'cmd' ? 2 : w;
    if (zone === 'navigateur') e.ux += 2;
    if (zone === 'kanban') e.cards += kind === 'edit' ? 3 : 1;
    if (zone === 'git' && /diff|show|log/.test(label)) e.review += 1;
  }
  e.review += (reads / (edits + 1)) * 2;
  const p = String(prompt || '');
  for (const k of Object.keys(e)) e[k] += kwCount(p, KW[k]) * 0.8;
  return e;
}

function downsample(arr, n) {
  if (arr.length <= n) return arr;
  const out = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * arr.length / n)]);
  out.push(arr[arr.length - 1]);
  return out;
}

const orchestrators = [];
const agents = [];
const daily = {};
const addDaily = (d, model, who, tok, n) => {
  const k = d + '|' + model + '|' + who;
  const a = (daily[k] ||= { day: d, model, who, i: 0, w5: 0, w1: 0, r: 0, o: 0, n: 0 });
  for (const f of ['i', 'w5', 'w1', 'r', 'o']) a[f] += tok[f] || 0;
  a.n += n || 1;
};

function claudeActions(rows, t0) {
  const acts = [];
  for (const r of rows) {
    if (r.type !== 'assistant' || !r.message) continue;
    for (const b of r.message.content || []) {
      if (b.type !== 'tool_use') continue;
      const i = b.input || {};
      const t = Math.round((Date.parse(r.timestamp) - t0) / 1000);
      let zone = 'autre', label = '', kind = 'other';
      if (['Read', 'NotebookRead'].includes(b.name)) { kind = 'read'; label = i.file_path || ''; zone = zoneOf(label); }
      else if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(b.name)) { kind = 'edit'; label = i.file_path || ''; zone = zoneOf(label); }
      else if (['Grep', 'Glob'].includes(b.name)) { kind = 'read'; label = (i.pattern || '') + (i.path ? ' dans ' + path.basename(String(i.path)) : ''); zone = zoneOf(i.path || i.glob || i.pattern); }
      else if (b.name === 'Bash' || b.name === 'PowerShell') { kind = 'cmd'; label = i.command || ''; zone = zoneOf(label, true); }
      else if (b.name === 'Agent' || b.name === 'Task') { kind = 'agent'; label = i.description || ''; zone = 'agent'; }
      else if (b.name === 'SendMessage') { kind = 'msg'; label = String(i.message || i.content || '').slice(0, 90); zone = 'message'; }
      else { label = i.description || i.skill || i.query || i.url || ''; }
      if (kind === 'read' || kind === 'edit') label = label.replace(/^.*?strates-fmenguy[\\\/]/i, '').replace(/\\/g, '/');
      acts.push([t, b.name, zone, clean(label, 110), kind, b.name === 'Bash' || b.name === 'PowerShell' ? cmdFamily(i.command) : null]);
    }
  }
  return acts;
}

function claudeUsage(rows) {
  const msgs = new Map();
  for (const r of rows) {
    if (r.type !== 'assistant' || !r.message || !r.message.usage) continue;
    const m = r.message; const key = m.id || r.uuid;
    const prev = msgs.get(key) || { model: m.model, ts: r.timestamp, out: 0 };
    prev.u = m.usage; prev.out = Math.max(prev.out, m.usage.output_tokens || 0);
    msgs.set(key, prev);
  }
  const calls = [];
  for (const v of msgs.values()) {
    if (!v.model || v.model === '<synthetic>') continue;
    const u = v.u, w1 = u.cache_creation?.ephemeral_1h_input_tokens || 0;
    calls.push({ ts: v.ts, model: v.model, i: u.input_tokens || 0, w5: (u.cache_creation_input_tokens || 0) - w1, w1, r: u.cache_read_input_tokens || 0, o: v.out });
  }
  return calls.sort((a, b) => a.ts.localeCompare(b.ts));
}
const sumTok = calls => calls.reduce((s, c) => { for (const f of ['i', 'w5', 'w1', 'r', 'o']) s[f] += c[f]; s.n++; return s; }, { i: 0, w5: 0, w1: 0, r: 0, o: 0, n: 0 });

function humanMessages(rows) {
  const out = [];
  for (const r of rows) {
    if (r.type !== 'user' || !r.message || r.isMeta || r.isSidechain) continue;
    const c = r.message.content;
    if (Array.isArray(c) && c.some(b => b.type === 'tool_result')) continue;
    const t = textOf(c).trim();
    if (!t || t.startsWith('<') || t.startsWith('[Request interrupted') || t.startsWith('Caveat:')) continue;
    out.push([r.timestamp, t]);
  }
  return out;
}

function familyClaude(title) {
  if (/^Contr[ôo]l/.test(title)) return 'ctrl';
  if (/^Enchaîner/.test(title)) return 'chain';
  if (/^(Audit|Étude|Analyse|Inventaire|Chasse|Faisabilit)/i.test(title)) return 'audit';
  if (/^(POC|Maquette)/.test(title)) return 'poc';
  if (/^(Tableau|Mettre à jour|Outil)/.test(title)) return 'tool';
  if (/relecture|relire|revue/i.test(title)) return 'ctrl';
  return 'impl';
}

/* ===== Claude ===== */
const sessions = fs.readdirSync(CLAUDE).filter(f => f.endsWith('.jsonl'));
for (const f of sessions) {
  const sid = f.replace('.jsonl', '');
  const rows = readJsonl(path.join(CLAUDE, f));
  const calls = claudeUsage(rows);
  if (!calls.length) continue;
  const t0 = Date.parse(calls[0].ts);
  const acts = claudeActions(rows.filter(r => !r.isSidechain), t0);
  const hm = humanMessages(rows);
  for (const c of calls) addDaily(day(c.ts), c.model, 'orchestrateur', c, 1);
  const models = [...new Set(calls.map(c => c.model))];
  const orch = {
    id: 'c-' + sid.slice(0, 8), kind: 'claude', models, start: calls[0].ts, end: calls[calls.length - 1].ts,
    tok: sumTok(calls), human: hm.map(([ts, t]) => [ts, clean(t, 160)]),
    acts: acts.map(a => [a[0], a[1], a[2], a[3], a[4], a[5]]),
    curve: downsample(calls.map(c => [Math.round((Date.parse(c.ts) - t0) / 1000), c.i + c.w5 + c.w1 + c.r + c.o]), 320),
  };
  orchestrators.push(orch);
  const subDir = path.join(CLAUDE, sid, 'subagents');
  if (!fs.existsSync(subDir)) continue;
  for (const sf of fs.readdirSync(subDir).filter(x => x.endsWith('.jsonl'))) {
    const srows = readJsonl(path.join(subDir, sf));
    let meta = {};
    try { meta = JSON.parse(fs.readFileSync(path.join(subDir, sf.replace('.jsonl', '.meta.json')), 'utf8')); } catch {}
    const scalls = claudeUsage(srows);
    if (!scalls.length) continue;
    const st0 = Date.parse(scalls[0].ts);
    const sacts = claudeActions(srows, st0);
    for (const c of scalls) addDaily(day(c.ts), c.model, 'agent', c, 1);
    let prompt = '', result = '';
    for (const r of srows) {
      if (!prompt && r.type === 'user' && r.message) { const t = textOf(r.message.content); if (t) prompt = t; }
      if (r.type === 'assistant' && r.message) for (const b of r.message.content || []) if (b.type === 'text' && b.text.trim()) result = b.text;
    }
    const title = meta.description || 'Sous-agent';
    agents.push({
      id: 'ca-' + sf.slice(6, 14), parent: orch.id, kind: 'claude', name: clean(title), nick: null,
      family: familyClaude(title), model: scalls[0].model, start: scalls[0].ts, end: scalls[scalls.length - 1].ts,
      tok: sumTok(scalls), acts: sacts, prompt: clean(prompt, 9000), result: clean(result, 5000),
      curve: downsample(scalls.map(c => [Math.round((Date.parse(c.ts) - st0) / 1000), c.i + c.w5 + c.w1 + c.r + c.o]), 140),
    });
  }
}

/* ===== Codex ===== */
const codexFiles = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.jsonl')) codexFiles.push(p); } })(CODEX);
const codexThreads = [];
for (const f of codexFiles.sort()) {
  const rows = readJsonl(f);
  const meta = rows.find(r => r.type === 'session_meta')?.payload || {};
  if (!/strates-fmenguy/i.test(meta.cwd || '')) continue;
  const spawn = meta.source && meta.source.subagent && meta.source.subagent.thread_spawn;
  let model = null; const seen = new Set(); const calls = []; const acts = []; const userMsgs = []; let prompt = ''; let result = '';
  const t0 = Date.parse(rows[0].timestamp);
  for (const r of rows) {
    const p = r.payload || {};
    if (r.type === 'turn_context' && p.model) model = p.model;
    if (r.type === 'event_msg' && p.type === 'thread_settings_applied' && p.thread_settings?.model) model = p.thread_settings.model;
    if (r.type === 'token_usage_record' && p.usage) {
      const id = p.response_id || r.timestamp;
      if (seen.has(id)) continue; seen.add(id);
      const u = p.usage;
      calls.push({ ts: r.timestamp, model: model || 'gpt-6-astra', i: Math.max((u.input_tokens || 0) - (u.cached_input_tokens || 0), 0), w5: u.cache_write_input_tokens || 0, w1: 0, r: u.cached_input_tokens || 0, o: u.output_tokens || 0 });
    }
    if (r.type === 'event_msg' && p.type === 'item_completed' && p.item?.type === 'UserMessage') {
      const t = textOf(p.item.content).trim(); if (t) userMsgs.push([r.timestamp, t]);
    }
    if (r.type === 'response_item' && p.type === 'message' && p.role === 'user' && !prompt) {
      const t = textOf(p.content).trim(); if (t && !t.startsWith('<')) prompt = t;
    }
    if (r.type === 'event_msg' && p.type === 'task_complete' && p.last_agent_message) result = p.last_agent_message;
    const t = Math.round((Date.parse(r.timestamp) - t0) / 1000);
    if (r.type === 'response_item' && p.type === 'custom_tool_call') {
      const code = String(p.input || '');
      const re = /tools\.(\w+)\(\s*(\{[\s\S]*?\})\s*\)/g; let m; let any = false;
      while ((m = re.exec(code))) {
        any = true;
        const tool = m[1], arg = m[2];
        if (tool === 'exec_command') {
          const cm = arg.match(/cmd\s*:\s*"((?:[^"\\]|\\.)*)"/) || arg.match(/cmd\s*:\s*'((?:[^'\\]|\\.)*)'/) || arg.match(/cmd\s*:\s*`([\s\S]*?)`/);
          let cmd = cm ? cm[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, ' ') : '';
          for (const part of cmd.split(/;\s*|\s&&\s/).filter(s => s.trim()).slice(0, 4)) {
            const z = zoneOf(part, true);
            const isRead = /^(Get-Content|cat|rg|Select-String|type)\b/.test(part.trim());
            acts.push([t, 'exec', isRead && z === 'terminal' ? zoneOf(part) : (isRead ? zoneOf(part) : z), clean(part.trim(), 110), isRead ? 'read' : 'cmd', cmdFamily(part)]);
          }
        } else if (tool === 'apply_patch') {
          const files = [...code.matchAll(/\*\*\* (?:Update|Add|Delete) File: ([^\n\\]+)/g)].map(x => x[1].trim());
          for (const fp of files.length ? files : ['patch']) acts.push([t, 'apply_patch', zoneOf(fp), clean(fp.replace(/^.*?strates-fmenguy[\\\/]/i, '').replace(/\\/g, '/'), 110), 'edit', null]);
        } else {
          acts.push([t, tool, 'autre', '', 'other', null]);
        }
      }
      if (!any) {
        const files = [...code.matchAll(/\*\*\* (?:Update|Add|Delete) File: ([^\n\\]+)/g)].map(x => x[1].trim());
        for (const fp of files) acts.push([t, 'apply_patch', zoneOf(fp), clean(fp.replace(/^.*?strates-fmenguy[\\\/]/i, '').replace(/\\/g, '/'), 110), 'edit', null]);
        if (!files.length) acts.push([t, p.name || 'outil', 'autre', '', 'other', null]);
      }
    }
    if (r.type === 'response_item' && p.type === 'function_call') {
      const nm = p.name || 'fonction';
      let label = '';
      try { const a = JSON.parse(p.arguments || '{}'); label = a.agent_path || a.message || a.task || a.path || ''; } catch {}
      acts.push([t, nm, /spawn|agent/.test(nm) ? 'agent' : 'autre', clean(String(label), 90), /spawn/.test(nm) ? 'agent' : 'other', null]);
    }
  }
  if (!calls.length) continue;
  const tid = meta.id || path.basename(f);
  codexThreads.push({ tid, spawn, model, calls, acts, userMsgs, prompt, result, start: calls[0].ts, end: calls[calls.length - 1].ts, t0 });
}
const codexChildren = new Set(codexThreads.filter(c => c.spawn).map(c => c.spawn.parent_thread_id));
for (const c of codexThreads) {
  const who = c.spawn ? 'agent' : 'orchestrateur';
  for (const k of c.calls) addDaily(day(k.ts), k.model, who, k, 1);
}
function cardFrom(txt) { const m = String(txt || '').match(/\b(BUG|EVO|MIG)-\d+(\.\d+)?\b/i); return m ? m[0].toUpperCase() : null; }
function familyCodex(pathName, prompt) {
  const p = String(pathName || '');
  if (/audit/.test(p)) return 'audit';
  if (/review/.test(p)) return 'ctrl';
  return 'impl';
}
for (const c of codexThreads) {
  const curve = downsample(c.calls.map(k => [Math.round((Date.parse(k.ts) - c.t0) / 1000), k.i + k.r + k.o + k.w5]), 140);
  const models = [...new Set(c.calls.map(k => k.model))];
  if (!c.spawn && codexChildren.has(c.tid)) {
    orchestrators.push({ id: 'x-' + c.tid.slice(0, 8), kind: 'codex', models, start: c.start, end: c.end, tok: sumTok(c.calls), human: c.userMsgs.map(([ts, t]) => [ts, clean(t, 160)]), acts: c.acts, curve, tid: c.tid });
  }
}
for (const c of codexThreads) {
  const isOrch = !c.spawn && codexChildren.has(c.tid);
  if (isOrch) continue;
  const curve = downsample(c.calls.map(k => [Math.round((Date.parse(k.ts) - c.t0) / 1000), k.i + k.r + k.o + k.w5]), 140);
  const sp = c.spawn;
  const card = cardFrom(sp ? sp.agent_path : '') || cardFrom(c.userMsgs.map(m => m[1]).join(' ')) || cardFrom(c.prompt);
  const name = sp ? sp.agent_path.replace('/root/', '').replace(/_/g, ' ') : (card ? card + ' (session directe)' : 'Session directe');
  agents.push({
    id: 'xa-' + c.tid.slice(-8), parent: sp ? 'x-' + sp.parent_thread_id.slice(0, 8) : 'codex-direct', kind: 'codex', name: clean(name), nick: sp ? sp.agent_nickname : null,
    family: sp ? familyCodex(sp.agent_path, c.prompt) : 'impl', model: c.calls[c.calls.length - 1].model, models: [...new Set(c.calls.map(k => k.model))],
    start: c.start, end: c.end, tok: sumTok(c.calls), acts: c.acts, prompt: clean(sp ? c.prompt : c.userMsgs.map(m => m[1]).join('\n\n'), 9000), result: clean(c.result, 5000),
    humanN: sp ? 0 : c.userMsgs.length, card, curve,
  });
}

/* ===== Archive ===== */
const archived = [];
for (const f of fs.readdirSync(ARCH).filter(x => /^strates-.*\.md$/.test(x))) {
  const txt = fs.readFileSync(path.join(ARCH, f), 'utf8');
  const fm = txt.match(/^---\n([\s\S]*?)\n---/);
  const get = k => (fm && (fm[1].match(new RegExp('^' + k + ':\\s*(.*)$', 'm')) || [])[1]) || '';
  archived.push({ id: 'ar-' + f.replace('.md', ''), parent: 'v1', kind: 'archive', name: get('name'), desc: clean(get('description')), tools: get('tools').split(',').map(s => s.trim()).filter(Boolean), model: get('model') || 'non déclaré', prompt: clean(txt.replace(/^---[\s\S]*?---\n/, ''), 6000) });
}

/* ===== Compétences ===== */
const AX = ['ui', 'ux', 'back', 'front', 'data', 'tests', 'review', 'cards'];
const raw = [];
for (const a of agents) raw.push([a, evidence(a.acts, a.prompt)]);
for (const a of archived) {
  const e = evidence([], a.desc + '\n' + a.prompt);
  if (!a.tools.includes('Edit')) e.review += 6;
  raw.push([a, e]);
}
const mx = {};
for (const k of AX) mx[k] = Math.max(...raw.map(([, e]) => Math.log1p(e[k])));
for (const [a, e] of raw) { a.skills = AX.map(k => Math.round(Math.log1p(e[k]) / mx[k] * 100)); a.ev = AX.map(k => +e[k].toFixed(1)); }

/* ===== sortie ===== */
for (const a of agents) a.acts = a.acts.length > 320 ? a.acts.filter((_, i) => i % Math.ceil(a.acts.length / 320) === 0) : a.acts;
for (const o of orchestrators) { o.actsN = o.acts.length; o.toolCounts = {}; for (const x of o.acts) o.toolCounts[x[1]] = (o.toolCounts[x[1]] || 0) + 1; o.acts = o.acts.filter(x => ['agent', 'edit', 'msg'].includes(x[4]) || x[2] === 'git' || x[2] === 'kanban'); }
const out = { orchestrators, agents, archived, daily: Object.values(daily).sort((a, b) => a.day.localeCompare(b.day)), axes: AX, generatedAt: new Date().toISOString() };
const safe = s => s.split('\uFFFD').join('\\ufffd');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'agents-data.js'), safe('window.STRATES_AGENTS = ' + JSON.stringify(out) + ';\n'));

const dashFile = path.join(STRATES, 'docs/v2/retours/v2-20260925/tableau-de-bord-data.js');
let cardsOut = { cards: [] };
if (fs.existsSync(dashFile)) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(dashFile, 'utf8'), ctx);
  const dd = ctx.window.STRATES_DASHBOARD;
  const cards = dd.cards.map(c => ({ id: c.id, type: c.type, title: clean(c.title), status: c.status, commits: c.git ? c.git.commits : 0, added: c.git ? c.git.added : 0, removed: c.git ? c.git.removed : 0, merged: c.git ? !!c.git.merged : false, usd: 0, min: 0, tok: 0, by: {} }));
  for (const [, ci, mi, i, cache, w, o, usd, min] of dd.rows) {
    const c = cards[ci]; if (!c) continue;
    const m = dd.models[mi].key;
    c.usd += usd; c.min += min; c.tok += i + cache + w + o; c.by[m] = (c.by[m] || 0) + usd;
  }
  for (const c of cards) { c.usd = +c.usd.toFixed(3); c.min = Math.round(c.min); for (const k in c.by) c.by[k] = +c.by[k].toFixed(3); }
  cardsOut = { generatedAt: dd.generatedAt, cards };
}
fs.writeFileSync(path.join(OUT, 'cards-data.js'), safe('window.STRATES_CARDS = ' + JSON.stringify(cardsOut) + ';\n'));
console.log('Orchestrateurs', orchestrators.length, '· sous-agents', agents.length, '· fiches archivées', archived.length, '· cartes', cardsOut.cards.length);
console.log('Écrit dans', OUT);
