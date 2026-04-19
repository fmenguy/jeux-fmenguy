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
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const padX = 22
  const bodyFont = '500 30px system-ui, sans-serif'
  ctx.font = bodyFont
  const bMetrics = ctx.measureText(text)
  const tw = Math.min(canvas.width - padX * 2, bMetrics.width)
  const bw = tw + padX * 2
  const bh = 64
  const bx = (canvas.width - bw) / 2
  const by = 10
  const r = 18
  const fillCol = isHint ? '#dff0ff' : '#ffffff'
  const borderCol = isHint ? '#4a90e2' : 'rgba(0,0,0,0.15)'
  const textCol = isHint ? '#0d2947' : '#1a1f2a'
  const borderW = isHint ? 3 : 2
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath(); ctx.roundRect(bx + 3, by + 5, bw, bh, r); ctx.fill()
  ctx.fillStyle = fillCol
  ctx.strokeStyle = borderCol
  ctx.lineWidth = borderW
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, r); ctx.fill(); ctx.stroke()
  const cxp = canvas.width / 2
  const tipY = by + bh + 18
  ctx.beginPath()
  ctx.moveTo(cxp - 12, by + bh - 1)
  ctx.lineTo(cxp + 12, by + bh - 1)
  ctx.lineTo(cxp, tipY)
  ctx.closePath()
  ctx.fillStyle = fillCol; ctx.fill()
  ctx.strokeStyle = borderCol; ctx.stroke()
  ctx.fillStyle = fillCol
  ctx.fillRect(cxp - 11, by + bh - 3, 22, 3)
  if (isHint) {
    ctx.fillStyle = '#ffd98a'
    ctx.beginPath()
    ctx.arc(bx + 22, by + bh / 2, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#4a90e2'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = textCol
  ctx.font = bodyFont
  ctx.fillText(text, canvas.width / 2, by + bh / 2, canvas.width - padX * 2)
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
  const bw = totalW + padX * 2
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
}
