import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { blocksToMd, bid, mdToBlocks, shortcut, SLASH, type Block, type BType } from '../lib/blocks'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const inline = (s: string) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
  .replace(/~~([^~]+)~~/g, '<s>$1</s>')
  .replace(/\[\[([^\]]+)\]\]/g, '<span class="wl" data-link="$1">$1</span>')
  .replace(/(^|\s)#([\p{L}\w-]+)/gu, '$1<span class="tag">#$2</span>')
  .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')

const PH: Partial<Record<BType, string>> = { h1: 'Título 1', h2: 'Título 2', h3: 'Título 3', todo: 'Tarefa', bullet: 'Item', number: 'Item', quote: 'Citação', callout: 'Escreva algo em destaque…', toggle: 'Alternância', code: 'Código' }
const LISTS: BType[] = ['bullet', 'number', 'todo']
const CALLOUT_ICONS = ['💡', '📌', '⚠️', '✅', '🎯', '🌸', '☕', '📊']

function grow(el: HTMLTextAreaElement | null) { if (el) { el.style.height = '0px'; el.style.height = el.scrollHeight + 'px' } }

/**
 * Editor em blocos, no estilo Notion:
 *  "/" abre o menu de blocos · atalhos "# ", "- ", "[] ", "> ", "---"
 *  Enter cria bloco · Backspace no início junta/converte · arraste ⋮⋮ para reordenar
 */
export function BlockEditor({ value, onChange, onLink }: { value: string; onChange: (md: string) => void; onLink: (title: string) => void }) {
  const [blocks, setBlocks] = useState<Block[]>(() => mdToBlocks(value))
  const [editing, setEditing] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ id: string; pos: number } | null>(null)
  const [slash, setSlash] = useState<{ id: string; i: number } | null>(null)
  const [drag, setDrag] = useState<{ from?: string; over?: string }>({})
  const [iconFor, setIconFor] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)

  const commit = (bs: Block[]) => { setBlocks(bs); onChange(blocksToMd(bs)) }
  const patch = (id: string, p: Partial<Block>) => commit(blocks.map(b => b.id === id ? { ...b, ...p } : b))
  const at = (id: string) => blocks.findIndex(b => b.id === id)

  useLayoutEffect(() => {
    if (!focus) return
    const el = root.current?.querySelector<HTMLTextAreaElement>(`textarea[data-id="${focus.id}"]`)
    if (el) { el.focus(); const p = Math.min(focus.pos, el.value.length); el.setSelectionRange(p, p); grow(el); setFocus(null) }
  })
  useEffect(() => { if (!editing) setSlash(null) }, [editing])

  const go = (id: string, pos: number) => { setEditing(id); setFocus({ id, pos }) }
  const addAfter = (id: string, b: Partial<Block> = {}) => {
    const i = at(id), nb: Block = { id: bid(), type: 'p', text: '', ...b }
    commit([...blocks.slice(0, i + 1), nb, ...blocks.slice(i + 1)]); go(nb.id, 0)
  }
  const setType = (id: string, type: BType) => {
    const b = blocks[at(id)]
    const extra: Partial<Block> = type === 'callout' ? { icon: b.icon ?? '💡' } : type === 'toggle' ? { open: true, body: b.body ?? '' } : {}
    if (type === 'divider') { commit(blocks.map(x => x.id === id ? { ...x, type, text: '' } : x)); addAfter(id); return }
    commit(blocks.map(x => x.id === id ? { ...x, type, text: x.text.startsWith('/') ? '' : x.text, ...extra } : x)); go(id, 0)
  }
  const slashItems = (b: Block) => { const q = b.text.slice(1).toLowerCase(); return SLASH.filter(s => !q || s.label.toLowerCase().includes(q) || s.keys.includes(q)) }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>, b: Block) => {
    const el = e.currentTarget, pos = el.selectionStart, end = el.selectionEnd, i = at(b.id)
    if (slash?.id === b.id) {
      const items = slashItems(b)
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlash({ id: b.id, i: Math.min(slash.i + 1, items.length - 1) }); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlash({ id: b.id, i: Math.max(slash.i - 1, 0) }); return }
      if (e.key === 'Enter') { e.preventDefault(); if (items[slash.i]) setType(b.id, items[slash.i].type); setSlash(null); return }
      if (e.key === 'Escape') { setSlash(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey && b.type !== 'code') {
      e.preventDefault()
      if (LISTS.includes(b.type) && !b.text) { patch(b.id, { type: 'p' }); return }
      const before = b.text.slice(0, pos), after = b.text.slice(end)
      const nb: Block = { id: bid(), type: LISTS.includes(b.type) ? b.type : 'p', text: after }
      commit([...blocks.slice(0, i), { ...b, text: before }, nb, ...blocks.slice(i + 1)]); go(nb.id, 0)
    } else if (e.key === 'Backspace' && pos === 0 && end === 0) {
      if (b.type !== 'p') { e.preventDefault(); patch(b.id, { type: 'p' }); return }
      if (i === 0) return
      e.preventDefault()
      const prev = blocks[i - 1]
      if (prev.type === 'divider') { commit(blocks.filter(x => x.id !== prev.id)); go(b.id, 0); return }
      commit([...blocks.slice(0, i - 1), { ...prev, text: prev.text + b.text }, ...blocks.slice(i + 1)]); go(prev.id, prev.text.length)
    } else if (e.key === 'ArrowUp' && pos === 0 && i > 0) { e.preventDefault(); const p = blocks.slice(0, i).reverse().find(x => x.type !== 'divider'); if (p) go(p.id, p.text.length) }
    else if (e.key === 'ArrowDown' && pos === b.text.length && i < blocks.length - 1) { e.preventDefault(); const nx = blocks.slice(i + 1).find(x => x.type !== 'divider'); if (nx) go(nx.id, 0) }
    else if (e.key === 'Escape') { setEditing(null); el.blur() }
  }

  const onText = (b: Block, text: string, el: HTMLTextAreaElement) => {
    grow(el)
    const sc = b.type === 'p' ? shortcut(text) : null
    if (sc) { if (sc.type === 'divider') { commit(blocks.map(x => x.id === b.id ? { ...x, type: 'divider', text: '' } : x)); addAfter(b.id); return } patch(b.id, { type: sc.type, text: '', ...(sc.type === 'code' ? {} : {}) }); return }
    patch(b.id, { text })
    setSlash(text.startsWith('/') && !text.includes(' ') ? { id: b.id, i: 0 } : null)
  }

  const field = (b: Block, cls = '') => {
    const ed = editing === b.id
    if (ed || b.type === 'code') return <textarea data-id={b.id} rows={1} className={`bfield ${cls}`} value={b.text} placeholder={ed ? (PH[b.type] ?? "Digite '/' para comandos") : ''}
      ref={grow} onChange={e => onText(b, e.target.value, e.target)} onKeyDown={e => onKey(e, b)} onFocus={() => setEditing(b.id)} onBlur={() => setTimeout(() => setEditing(c => c === b.id ? null : c), 120)} spellCheck />
    return <div className={`bfield view ${cls} ${b.text ? '' : 'empty'}`} data-ph={PH[b.type] ?? ''}
      onMouseDown={e => { const t = e.target as HTMLElement; if (t.dataset.link) { e.preventDefault(); onLink(t.dataset.link); return } if (t.tagName === 'A') return; e.preventDefault(); go(b.id, b.text.length) }}
      dangerouslySetInnerHTML={{ __html: b.text ? inline(b.text) : '&nbsp;' }} />
  }

  let num = 0
  return <div className="beditor" ref={root}>
    {blocks.map((b, i) => {
      num = b.type === 'number' ? (blocks[i - 1]?.type === 'number' ? num + 1 : 1) : 0
      return <div key={b.id} className={`blk blk-${b.type} ${drag.over === b.id ? 'over' : ''}`}
        onDragOver={e => { if (drag.from) { e.preventDefault(); setDrag(d => ({ ...d, over: b.id })) } }}
        onDrop={e => { e.preventDefault(); if (!drag.from || drag.from === b.id) return setDrag({}); const from = blocks.find(x => x.id === drag.from)!; const rest = blocks.filter(x => x.id !== drag.from); const j = rest.findIndex(x => x.id === b.id); commit([...rest.slice(0, j + 1), from, ...rest.slice(j + 1)]); setDrag({}) }}>
        <div className="gutter">
          <button className="gbtn" onClick={() => addAfter(b.id)} aria-label="Adicionar bloco" tabIndex={-1}>+</button>
          <span className="gbtn grip" draggable onDragStart={() => setDrag({ from: b.id })} onDragEnd={() => setDrag({})} title="Arraste para mover">⋮⋮</span>
        </div>
        <div className="bbody">
          {b.type === 'divider' ? <hr onClick={() => go(b.id, 0)} /> :
            b.type === 'todo' ? <div className="row-b"><input type="checkbox" checked={!!b.checked} onChange={e => patch(b.id, { checked: e.target.checked })} />{field(b, b.checked ? 'done' : '')}</div> :
              b.type === 'bullet' ? <div className="row-b"><span className="mark">•</span>{field(b)}</div> :
                b.type === 'number' ? <div className="row-b"><span className="mark num">{num}.</span>{field(b)}</div> :
                  b.type === 'callout' ? <div className="callout"><button className="cicon" onClick={() => setIconFor(iconFor === b.id ? null : b.id)}>{b.icon ?? '💡'}</button>{field(b)}
                    <AnimatePresence>{iconFor === b.id && <motion.div className="ipick" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{CALLOUT_ICONS.map(ic => <button key={ic} onClick={() => { patch(b.id, { icon: ic }); setIconFor(null) }}>{ic}</button>)}</motion.div>}</AnimatePresence></div> :
                    b.type === 'toggle' ? <div><div className="row-b"><motion.button className="tg" animate={{ rotate: b.open ? 90 : 0 }} onClick={() => patch(b.id, { open: !b.open })}>▸</motion.button>{field(b, 'tg-title')}</div>
                      <AnimatePresence initial={false}>{b.open && <motion.div className="tg-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <textarea className="bfield" rows={1} ref={grow} value={b.body ?? ''} placeholder="Conteúdo escondido…" onChange={e => { grow(e.target); patch(b.id, { body: e.target.value }) }} />
                      </motion.div>}</AnimatePresence></div> :
                      field(b)}
          <AnimatePresence>{slash?.id === b.id && <motion.div className="slash" initial={{ opacity: 0, y: -4, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="slash-t">Blocos</div>
            {slashItems(b).map((s, k) => <button key={s.type} className={k === slash.i ? 'on' : ''} onMouseEnter={() => setSlash({ id: b.id, i: k })} onMouseDown={e => { e.preventDefault(); setType(b.id, s.type); setSlash(null) }}>
              <span className="si">{s.icon}</span><span><b>{s.label}</b><small>{s.hint}</small></span></button>)}
            {!slashItems(b).length && <div className="slash-t">Nada encontrado</div>}
          </motion.div>}</AnimatePresence>
        </div>
      </div>
    })}
    <div className="bend" onClick={() => { const last = blocks[blocks.length - 1]; if (last && last.type === 'p' && !last.text) go(last.id, 0); else addAfter(last.id) }} />
  </div>
}
