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

export function makeBubbleCanvas() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 160
  return c
}

export function drawBubble(canvas, text, isHint) {
  const ctx = canvas.getContext('2d')
  const padX = 24
  const padY = 16
  const lineH = 36
  const bodyFont = '500 28px system-ui, sans-serif'
  const iconW = isHint ? 28 : 0
  const maxTextW = canvas.width - padX * 2 - iconW

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

  // Largeur reelle de la bulle
  let maxLW = 0
  for (const l of lines) { const w = ctx.measureText(l).width; if (w > maxLW) maxLW = w }
  const bw = Math.min(canvas.width - 8, maxLW + padX * 2 + iconW)

  // Hauteur de la bulle selon le nombre de lignes
  const bh = lines.length * lineH + padY * 2
  const by = 10
  const tipH = 26
  const canvasH = by + bh + tipH + 14

  // Redimensionnement dynamique du canvas (remet le contexte a zero)
  if (canvas.height !== canvasH) canvas.height = canvasH

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = bodyFont

  const bx = (canvas.width - bw) / 2
  const r = 16
  const fillCol = isHint ? '#dff0ff' : '#ffffff'
  const borderCol = isHint ? '#4a90e2' : 'rgba(0,0,0,0.15)'
  const textCol = isHint ? '#0d2947' : '#1a1f2a'
  const borderW = isHint ? 3 : 2

  // Ombre portee
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath(); ctx.roundRect(bx + 3, by + 4, bw, bh, r); ctx.fill()

  // Corps de la bulle
  ctx.fillStyle = fillCol
  ctx.strokeStyle = borderCol
  ctx.lineWidth = borderW
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, r); ctx.fill(); ctx.stroke()

  // Queue triangulaire
  const cxp = canvas.width / 2
  const tipY = by + bh + tipH
  ctx.beginPath()
  ctx.moveTo(cxp - 11, by + bh - 1)
  ctx.lineTo(cxp + 11, by + bh - 1)
  ctx.lineTo(cxp, tipY)
  ctx.closePath()
  ctx.fillStyle = fillCol; ctx.fill()
  ctx.strokeStyle = borderCol; ctx.stroke()
  // Masque la couture entre le rect et le triangle
  ctx.fillStyle = fillCol
  ctx.fillRect(cxp - 10, by + bh - 2, 20, 3)

  // Pastille indicatrice pour les hints
  if (isHint) {
    ctx.fillStyle = '#ffd98a'
    ctx.beginPath()
    ctx.arc(bx + 20, by + bh / 2, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#4a90e2'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // Lignes de texte centrees
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = textCol
  ctx.font = bodyFont
  const textX = canvas.width / 2
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
