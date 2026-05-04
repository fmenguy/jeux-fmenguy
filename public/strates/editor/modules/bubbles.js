import { GENDER_SYMBOLS, GENDER_COLORS, CHIEF_STAR, CHIEF_COLOR } from './constants.js'

// ============================================================================
// Canvas helpers pour bulles de dialogue et etiquettes
// ============================================================================

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r }
    this.beginPath()
    this.moveTo(x + r.tl, y)
    this.lineTo(x + w - r.tr, y)
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr)
    this.lineTo(x + w, y + h - r.br)
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h)
    this.lineTo(x + r.bl, y + h)
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl)
    this.lineTo(x, y + r.tl)
    this.quadraticCurveTo(x, y, x + r.tl, y)
    this.closePath()
    return this
  }
}

// Convertit '#rrggbb' en 'rgba(r,g,b,a)'. Utilise pour la lueur des bulles
// idle (Lot E) qui prend la couleur du metier en alpha 0.4.
function _hexToRgba(hex, alpha) {
  if (typeof hex !== 'string') return 'rgba(0,0,0,' + alpha + ')'
  const m = hex.replace('#', '')
  const v = m.length === 3
    ? m.split('').map(c => c + c).join('')
    : m
  const r = parseInt(v.slice(0, 2), 16) || 0
  const g = parseInt(v.slice(2, 4), 16) || 0
  const b = parseInt(v.slice(4, 6), 16) || 0
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

export function makeBubbleCanvas() {
  const c = document.createElement('canvas')
  // Résolution texture augmentée pour des bulles lisibles à zoom standard.
  // Largeur fixe (le texte se wrap sur plusieurs lignes au-delà), hauteur
  // ajustée dynamiquement par drawBubble selon le nombre de lignes.
  c.width = 768; c.height = 240
  return c
}

// Style "ardoise+or" : fond opaque sombre cohérent avec le HUD Strates,
// bordure dorée, texte crème net. Contraste 9:1, lisible sur tous biomes.
//   - Pas de fond translucide qui se mélange à l herbe ou la neige.
//   - Pas d ombre baveuse autour du texte ; juste une drop-shadow nette derrière.
//   - Un liseré crème intérieur 1 px donne un aspect "encadré gravé".
//   - Variantes :
//       hint  : bordure & accent bleu-or (info pédagogique)
//       idle  : bordure couleur métier + glow soft
//       défaut: bordure dorée standard
const COL = {
  bg:        '#1c1a14',          // ardoise (cf topbar / modales du jeu)
  bgHint:    '#1a2436',           // ardoise bleutée pour les hints
  border:    '#c8a84b',           // gold standard du jeu
  borderIn:  'rgba(243,236,221,0.18)', // liseré crème intérieur
  text:      '#f3ecdd',           // crème "papier" du HUD
  textHint:  '#dfeaff',           // crème bleutée pour les hints
  hintAcc:   '#ffd98a',           // pastille hint (or chaud)
  shadow:    'rgba(0,0,0,0.55)',  // ombre portée nette
}

export function drawBubble(canvas, text, isHint, opts) {
  const ctx = canvas.getContext('2d')
  const padX = 36
  const padY = 24
  const lineH = 48
  // Police plus carrée et bien graissée pour la lisibilité à toute distance.
  const bodyFont = '700 40px "Inter", "Segoe UI", system-ui, sans-serif'
  const iconW = isHint ? 42 : 0
  const maxTextW = canvas.width - padX * 2 - iconW

  // Variante idle (Lot E + Lot B) : bordure couleur métier.
  const isIdle = !!(opts && opts.kind === 'idle' && opts.borderColor)
  const idleBorderCol = isIdle ? opts.borderColor : null

  // Word wrapping
  ctx.font = bodyFont
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const word of words) {
    const candidate = cur ? cur + ' ' + word : word
    if (cur && ctx.measureText(candidate).width > maxTextW) {
      lines.push(cur)
      cur = word
    } else {
      cur = candidate
    }
  }
  if (cur) lines.push(cur)

  // Largeur réelle de la bulle
  let maxLW = 0
  for (const l of lines) { const w = ctx.measureText(l).width; if (w > maxLW) maxLW = w }
  const bw = Math.min(canvas.width - 14, maxLW + padX * 2 + iconW)

  // Hauteur de la bulle selon le nombre de lignes
  const bh = lines.length * lineH + padY * 2
  const by = 18
  const tipH = 30
  const canvasH = by + bh + tipH + 22

  // Redimensionnement dynamique du canvas (remet le contexte à zéro)
  if (canvas.height !== canvasH) canvas.height = canvasH

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = bodyFont

  const bx = (canvas.width - bw) / 2
  const r = 14
  const fillCol = isHint ? COL.bgHint : COL.bg
  const borderCol = idleBorderCol || COL.border
  const textCol = isHint ? COL.textHint : COL.text

  // Glow couleur métier (idle uniquement) sous la bulle
  if (idleBorderCol) {
    ctx.save()
    ctx.shadowColor = _hexToRgba(idleBorderCol, 0.45)
    ctx.shadowBlur = 22
    ctx.fillStyle = 'rgba(0,0,0,0)'
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, r); ctx.fill()
    ctx.restore()
  }

  // Ombre portée nette (drop shadow simple, pas de blur baveux)
  ctx.fillStyle = COL.shadow
  ctx.beginPath(); ctx.roundRect(bx + 4, by + 5, bw, bh, r); ctx.fill()

  // Corps de la bulle (ardoise opaque)
  ctx.fillStyle = fillCol
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, r); ctx.fill()

  // Bordure dorée extérieure
  ctx.strokeStyle = borderCol
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, r); ctx.stroke()

  // Liseré clair intérieur (effet panneau gravé)
  ctx.strokeStyle = COL.borderIn
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(bx + 3, by + 3, bw - 6, bh - 6, r - 3); ctx.stroke()

  // Queue triangulaire alignée sur le corps
  const cxp = canvas.width / 2
  const tipY = by + bh + tipH
  ctx.beginPath()
  ctx.moveTo(cxp - 16, by + bh - 1)
  ctx.lineTo(cxp + 16, by + bh - 1)
  ctx.lineTo(cxp, tipY)
  ctx.closePath()
  ctx.fillStyle = fillCol; ctx.fill()
  ctx.strokeStyle = borderCol; ctx.lineWidth = 3; ctx.stroke()
  // Masque la couture entre le rect et le triangle
  ctx.fillStyle = fillCol
  ctx.fillRect(cxp - 15, by + bh - 2, 30, 4)

  // Pastille indicatrice pour les hints
  if (isHint) {
    ctx.fillStyle = COL.hintAcc
    ctx.beginPath()
    ctx.arc(bx + 28, by + bh / 2, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = COL.border
    ctx.lineWidth = 2
    ctx.stroke()
    // Petit "i" gravé dedans
    ctx.fillStyle = COL.bg
    ctx.font = '800 16px "Inter", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('i', bx + 28, by + bh / 2 + 1)
    ctx.font = bodyFont
  }

  // Lignes de texte centrées (offset léger droite si pastille hint)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = textCol
  ctx.font = bodyFont
  const textX = canvas.width / 2 + (isHint ? 10 : 0)
  const textStartY = by + padY + lineH / 2
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textX, textStartY + i * lineH)
  }

  return { bw, bh: canvasH }
}

export function makeLabelCanvas() {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 64
  return c
}

export function drawLabel(canvas, name, gender, isChief) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = '600 22px system-ui, sans-serif'
  const sym = GENDER_SYMBOLS[gender] || ''
  const starStr = isChief ? (CHIEF_STAR + ' ') : ''
  const starW = starStr ? ctx.measureText(starStr).width : 0
  const nameW = ctx.measureText(name).width
  const symW = ctx.measureText(' ' + sym).width
  const totalW = starW + nameW + symW
  const padX = 14
  const bw = Math.min(canvas.width - 8, totalW + padX * 2)
  const bh = 36
  const bx = (canvas.width - bw) / 2
  const by = (canvas.height - bh) / 2
  ctx.fillStyle = 'rgba(15, 18, 24, 0.78)'
  ctx.strokeStyle = 'rgba(255, 217, 138, 0.35)'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const startX = canvas.width / 2 - totalW / 2
  const midY = canvas.height / 2
  if (starStr) {
    ctx.fillStyle = CHIEF_COLOR
    ctx.fillText(starStr, startX, midY)
  }
  ctx.fillStyle = '#f3ecdd'
  ctx.fillText(name, startX + starW, midY)
  ctx.fillStyle = GENDER_COLORS[gender] || '#f3ecdd'
  ctx.fillText(' ' + sym, startX + starW + nameW, midY)
  return { bw }
}
