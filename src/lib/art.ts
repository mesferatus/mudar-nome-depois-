/*
 * Desenhos fofos em SVG, gerados em código (sem imagens externas).
 * Usados como capas das páginas e como "doodles" de fundo dos temas.
 */
const uri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
const tile = (w: number, h: number, body: string) => `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`

const heart = (x: number, y: number, s: number, c: string, r = 0) =>
  `<path transform='translate(${x} ${y}) rotate(${r}) scale(${s})' d='M0 4C0-2 8-3 8 3C8-3 16-2 16 4C16 10 8 14 8 16C8 14 0 10 0 4Z' fill='${c}'/>`
const star = (x: number, y: number, s: number, c: string) =>
  `<path transform='translate(${x} ${y}) scale(${s})' d='M0-10C1.5-3 3-1.5 10 0C3 1.5 1.5 3 0 10C-1.5 3-3 1.5-10 0C-3-1.5-1.5-3 0-10Z' fill='${c}'/>`
const cloud = (x: number, y: number, s: number, c: string) =>
  `<g transform='translate(${x} ${y}) scale(${s})' fill='${c}'><circle cx='10' cy='12' r='8'/><circle cx='22' cy='8' r='10'/><circle cx='34' cy='12' r='8'/><rect x='10' y='10' width='24' height='10' rx='5'/></g>`
const flower = (x: number, y: number, s: number, c: string, m: string) =>
  `<g transform='translate(${x} ${y}) scale(${s})'>${[0, 72, 144, 216, 288].map(a => `<ellipse cx='0' cy='-7' rx='5' ry='7' fill='${c}' transform='rotate(${a})'/>`).join('')}<circle r='4' fill='${m}'/></g>`
const bean = (x: number, y: number, s: number, c: string, r: number) =>
  `<g transform='translate(${x} ${y}) rotate(${r}) scale(${s})'><ellipse rx='7' ry='10' fill='${c}'/><path d='M0-9C-3-3 3 3 0 9' stroke='rgba(0,0,0,.25)' stroke-width='1.6' fill='none'/></g>`
const strawberry = (x: number, y: number, s: number, r = 0) =>
  `<g transform='translate(${x} ${y}) rotate(${r}) scale(${s})'><path d='M-9-4C-9 6-3 12 0 13C3 12 9 6 9-4C6-7-6-7-9-4Z' fill='#f07a8a'/><path d='M-7-5L-3-9L0-6L3-9L7-5Z' fill='#6fbf73'/><circle cx='-4' cy='0' r='.9' fill='#ffe3a3'/><circle cx='3' cy='2' r='.9' fill='#ffe3a3'/><circle cx='0' cy='6' r='.9' fill='#ffe3a3'/></g>`
const dot = (x: number, y: number, r: number, c: string) => `<circle cx='${x}' cy='${y}' r='${r}' fill='${c}'/>`

const moon = (x: number, y: number, s: number, c: string, bg: string) =>
  `<g transform='translate(${x} ${y}) scale(${s})'><circle r='10' fill='${c}'/><circle cx='5' cy='-4' r='9' fill='${bg}'/></g>`
const bat = (x: number, y: number, s: number, c: string) =>
  `<path transform='translate(${x} ${y}) scale(${s})' d='M0-3C2-6 4-6 5-4C7-8 12-8 16-4C12-4 11-1 12 2C9 0 7 1 6 3C4 1 2 1 0 3C-2 1-4 1-6 3C-7 1-9 0-12 2C-11-1-12-4-16-4C-12-8-7-8-5-4C-4-6-2-6 0-3Z' fill='${c}'/>`
const hat = (x: number, y: number, s: number, c: string, b: string) =>
  `<g transform='translate(${x} ${y}) scale(${s})'><path d='M-2-16C4-12 6-4 8 4L-8 4C-6-4-6-10-2-16Z' fill='${c}'/><ellipse cy='5' rx='14' ry='3.5' fill='${c}'/><rect x='-8' y='0' width='16' height='3' fill='${b}'/></g>`
const cat = (x: number, y: number, s: number, c: string) =>
  `<g transform='translate(${x} ${y}) scale(${s})' fill='${c}'><path d='M-8-6L-7-14L-2-9L2-9L7-14L8-6C10-2 9 6 0 7C-9 6-10-2-8-6Z'/><path d='M6 6C12 6 14 12 10 15' stroke='${c}' stroke-width='2.5' fill='none' stroke-linecap='round'/></g>`
const potion = (x: number, y: number, s: number, c: string, g: string) =>
  `<g transform='translate(${x} ${y}) scale(${s})'><rect x='-3' y='-14' width='6' height='5' rx='1' fill='${c}'/><path d='M-3-9L-3-5C-9-3-11 2-10 6C-9 11-4 13 0 13C4 13 9 11 10 6C11 2 9-3 3-5L3-9Z' fill='${c}'/><path d='M-9 3C-6 1-3 4 0 2C3 0 6 3 9 2C9 8 5 12 0 12C-5 12-9 8-9 3Z' fill='${g}'/><circle cx='-3' cy='6' r='1.5' fill='rgba(255,255,255,.6)'/></g>`
const rose = (x: number, y: number, s: number, c: string, l: string) =>
  `<g transform='translate(${x} ${y}) scale(${s})'><path d='M0 6L0 18' stroke='${l}' stroke-width='2'/><ellipse cx='5' cy='13' rx='4' ry='2' fill='${l}' transform='rotate(-30 5 13)'/><circle r='7' fill='${c}'/><path d='M-4-1C-2-5 3-5 4-1C2-3-1-3-1 1C1 3 4 2 4 0' stroke='rgba(0,0,0,.3)' stroke-width='1.2' fill='none'/></g>`
const pumpkin = (x: number, y: number, s: number, c: string) =>
  `<g transform='translate(${x} ${y}) scale(${s})'><ellipse cx='-5' rx='6' ry='8' fill='${c}'/><ellipse cx='5' rx='6' ry='8' fill='${c}'/><ellipse rx='6' ry='8.5' fill='${c}' stroke='rgba(0,0,0,.15)'/><rect x='-1.2' y='-12' width='2.4' height='5' rx='1' fill='#5c7a3a'/></g>`
const sparkle = (x: number, y: number, s: number, c: string) => star(x, y, s, c)

export interface Cover { id: string; name: string; bg: string }

export const COVERS: Cover[] = [
  { id: 'morango', name: 'Morangos', bg: `${uri(tile(120, 90, strawberry(25, 25, 1.2, -12) + strawberry(85, 60, 1, 15) + heart(70, 10, .6, '#ffb3c1') + heart(10, 62, .5, '#ffb3c1', -15)))}, #ffe1e7` },
  { id: 'coracoes', name: 'Corações', bg: `${uri(tile(90, 80, heart(10, 10, .9, '#ff8fab', -12) + heart(55, 45, .7, '#ffc2d1', 10) + dot(70, 15, 2.5, '#fff') + dot(20, 60, 2, '#fff')))}, linear-gradient(120deg, #ffd6e0, #ffc8dd)` },
  { id: 'nuvens', name: 'Nuvens', bg: `${uri(tile(160, 90, cloud(10, 15, 1.1, '#fff') + cloud(95, 50, .9, 'rgba(255,255,255,.85)') + star(140, 18, .5, '#fff7c2')))}, linear-gradient(180deg, #a9d6f5, #d6ecff)` },
  { id: 'estrelas', name: 'Céu estrelado', bg: `${uri(tile(110, 90, star(20, 20, 1, '#ffe8a3') + star(80, 55, .6, '#fff') + star(55, 15, .35, '#fff') + dot(30, 70, 1.6, '#fff') + dot(95, 20, 1.2, '#ffe8a3')))}, linear-gradient(135deg, #2b2d6e, #5b4b9a)` },
  { id: 'jardim', name: 'Jardim', bg: `${uri(tile(110, 90, flower(22, 25, 1, '#ffd1dc', '#ffcc66') + flower(80, 62, .8, '#fff', '#ffcc66') + dot(70, 18, 3, '#bfe6c4') + dot(25, 70, 2.5, '#bfe6c4')))}, #cdeccf` },
  { id: 'cafe', name: 'Grãos de café', bg: `${uri(tile(100, 80, bean(20, 20, 1, '#6b4530', -25) + bean(70, 55, .9, '#7d5238', 30) + bean(75, 15, .6, '#8a5c3f', 60) + dot(30, 62, 2, '#f1dabf')))}, linear-gradient(135deg, #c79d7b, #e9cfae)` },
  { id: 'poa', name: 'Poá', bg: `${uri(tile(40, 40, dot(10, 10, 4, '#fff') + dot(30, 30, 4, '#fff')))}, #f6c9a8` },
  { id: 'xadrez', name: 'Piquenique', bg: `repeating-linear-gradient(0deg, rgba(255,255,255,.45) 0 14px, transparent 14px 28px), repeating-linear-gradient(90deg, rgba(255,255,255,.45) 0 14px, transparent 14px 28px), #f28b9a` },
  { id: 'por-do-sol', name: 'Pôr do sol', bg: `${uri(tile(200, 100, `<circle cx='150' cy='70' r='26' fill='#fff1c9' opacity='.9'/>` + cloud(20, 30, .8, 'rgba(255,255,255,.55)')))} no-repeat right bottom / auto 100%, linear-gradient(135deg, #ff9a8b, #ffc3a0 55%, #ffe3b3)` },
  { id: 'bruxinha', name: 'Bruxinha', bg: `${uri(tile(150, 100, hat(30, 40, 1.2, '#3a2458', '#b8f28a') + moon(110, 25, 1, '#fff3b0', '#6b4aa0') + star(80, 70, .5, '#fff3b0') + potion(125, 75, .9, '#e9d8ff', '#b8f28a')))}, linear-gradient(135deg, #6b4aa0, #9b7fd1)` },
  { id: 'gatinhos', name: 'Gatinhos', bg: `${uri(tile(120, 90, cat(28, 30, 1.3, '#2a2030') + moon(90, 22, .8, '#fff3b0', '#c9b5ff') + star(85, 70, .45, '#fff') + dot(20, 75, 2, '#fff')))}, #c9b5ff` },
  { id: 'morcegos', name: 'Morcegos', bg: `${uri(tile(140, 90, bat(35, 30, 1.3, '#140c12') + bat(105, 65, .9, '#140c12') + moon(110, 20, .7, '#ffe7c2', '#5a1a2a') + dot(60, 75, 1.4, '#ffe7c2')))}, linear-gradient(135deg, #5a1a2a, #2a0d16)` },
  { id: 'rosas', name: 'Rosas góticas', bg: `${uri(tile(110, 100, rose(28, 28, 1.3, '#b3203d', '#3d5a3a') + rose(80, 70, .9, '#7a1028', '#3d5a3a') + dot(85, 20, 1.5, '#e8c3c9')))}, #1a1014` },
  { id: 'abobora', name: 'Abóboras', bg: `${uri(tile(120, 90, pumpkin(30, 35, 1.4, '#f28c38') + pumpkin(90, 65, .9, '#ffad5c') + star(90, 20, .5, '#fff3b0') + dot(20, 75, 2, '#fff3b0')))}, linear-gradient(135deg, #4a2c6b, #6b3f8f)` },
  { id: 'lavanda', name: 'Lavanda', bg: `${uri(tile(80, 80, sparkle(20, 20, .7, '#fff') + heart(48, 45, .55, '#fff', 12) + dot(65, 15, 2, '#fff')))}, linear-gradient(135deg, #e3d4ff, #fbd4f0)` },
  { id: 'menta', name: 'Menta', bg: `${uri(tile(70, 70, star(18, 18, .55, '#fff') + heart(42, 40, .5, '#fff', 10)))}, linear-gradient(135deg, #b8f0d8, #a3e4f0)` },
]
export const coverBg = (id?: string) => COVERS.find(c => c.id === id)?.bg

/** Doodles de fundo dos temas (bem sutis). */
export const DOODLES: Record<string, string> = {
  bruxinha: uri(tile(260, 240, hat(50, 50, 1.3, 'rgba(201,167,255,.08)', 'rgba(184,242,138,.12)') + moon(190, 60, 1, 'rgba(255,243,176,.1)', '#1b1428') + potion(190, 180, 1, 'rgba(201,167,255,.08)', 'rgba(184,242,138,.12)') + star(80, 190, .6, 'rgba(255,243,176,.12)'))),
  gotico: uri(tile(260, 240, bat(60, 50, 1.4, 'rgba(192,48,74,.12)') + rose(190, 170, 1.1, 'rgba(192,48,74,.12)', 'rgba(120,160,110,.08)') + moon(200, 50, .8, 'rgba(255,231,194,.07)', '#0c0a0d') + bat(80, 180, .8, 'rgba(192,48,74,.08)'))),
  lavanda: uri(tile(220, 200, sparkle(40, 40, .9, 'rgba(155,110,230,.15)') + heart(150, 120, .7, 'rgba(240,140,200,.14)', 12) + dot(170, 40, 3, 'rgba(155,110,230,.12)') + sparkle(60, 160, .5, 'rgba(240,140,200,.15)'))),
  abobora: uri(tile(250, 220, pumpkin(50, 50, 1.4, 'rgba(242,140,56,.12)') + bat(180, 60, 1, 'rgba(201,167,255,.1)') + cat(170, 170, 1.1, 'rgba(201,167,255,.08)') + star(70, 180, .6, 'rgba(255,243,176,.12)'))),
  cafe: uri(tile(220, 220, bean(40, 40, 1.1, 'rgba(241,218,191,.05)', -20) + bean(160, 150, .9, 'rgba(241,218,191,.05)', 35) + star(170, 40, .6, 'rgba(241,218,191,.05)'))),
  noite: uri(tile(200, 200, star(30, 30, .9, 'rgba(255,255,255,.07)') + star(150, 120, .5, 'rgba(255,255,255,.06)') + dot(100, 60, 1.4, 'rgba(255,255,255,.12)') + dot(60, 160, 1, 'rgba(255,255,255,.12)'))),
  morango: uri(tile(240, 220, strawberry(40, 40, 1.4, -15).replace(/#f07a8a/g, 'rgba(240,122,138,.14)').replace(/#6fbf73/g, 'rgba(111,191,115,.16)').replace(/#ffe3a3/g, 'rgba(255,255,255,.4)') + heart(170, 140, .8, 'rgba(255,143,171,.12)', 12) + heart(180, 30, .5, 'rgba(255,143,171,.1)'))),
  nuvem: uri(tile(260, 200, cloud(20, 30, 1.2, 'rgba(255,255,255,.7)') + cloud(150, 130, .9, 'rgba(255,255,255,.6)') + star(210, 40, .5, 'rgba(255,214,102,.35)'))),
  jardim: uri(tile(230, 210, flower(40, 40, 1.1, 'rgba(255,182,193,.22)', 'rgba(255,204,102,.3)') + flower(170, 150, .8, 'rgba(255,255,255,.5)', 'rgba(255,204,102,.3)') + dot(150, 40, 3, 'rgba(120,180,130,.15)'))),
}

export const ICONS = ['🔮', '🦇', '🌙', '🖤', '🕯️', '🎃', '🐈‍⬛', '🥀', '🧪', '🧹', '📄', '📝', '📌', '📊', '📦', '🚚', '🏭', '💡', '✅', '🗓️', '🎯', '📈', '☕', '🌸', '🍓', '⭐', '🌙', '☁️', '🌿', '💖', '🧠', '📚', '✈️', '🏠', '🎨', '🐱', '🐶', '🧁', '🍀', '🔥']
