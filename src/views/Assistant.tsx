import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../lib/store'
import { Btn, Card, Icon, Page, Seg, spring } from '../components/ui'
import { applyActions, copilotPrompt, describe, deviceAsk, deviceCached, deviceLoad, deviceReady, deviceSupported, DEVICE_MODELS, ollamaAsk, ollamaModels, ollamaPull, parseReply, PRESETS, SUGGESTED_MODEL, type Action } from '../lib/ai'

type Engine = 'aparelho' | 'local' | 'copilot'
const isPhone = () => matchMedia('(max-width: 760px), (pointer: coarse)').matches
type Msg = { role: 'user' | 'assistant'; content: string; acoes?: Action[]; applied?: boolean }
const store = { get: (k: string) => { try { return localStorage.getItem(k) ?? '' } catch { return '' } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } } }

/** Assistente: conversa com seus dados e propõe ações que você aprova. Local (Ollama) ou Copilot da empresa. */
export default function Assistant() {
  const { data, replaceAll, toast } = useStore()
  const [engine, setEngine] = useState<Engine>(() => {
    const e = store.get('kairotec:ai-engine') as Engine
    if (e === 'copilot' || (e === 'aparelho' && deviceSupported()) || (e === 'local' && !isPhone())) return e
    return deviceSupported() ? 'aparelho' : 'copilot'
  })
  const [devModel, setDevModel] = useState(() => store.get('kairotec:ai-device') || (isPhone() ? DEVICE_MODELS[1].id : DEVICE_MODELS[0].id))
  const [devState, setDevState] = useState<{ pct?: number; text?: string; cached?: boolean; err?: string }>({})
  const [models, setModels] = useState<string[] | null | undefined>(undefined) // undefined = verificando, null = Ollama não encontrado
  const [model, setModel] = useState(() => store.get('kairotec:ai-model') || SUGGESTED_MODEL)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<{ pedido: string; notas: boolean } | null>(null)
  const [paste, setPaste] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const end = useRef<HTMLDivElement>(null)

  const check = () => { setModels(undefined); ollamaModels().then(m => { setModels(m); if (m?.length && !m.includes(model)) setModel(m.find(x => x.startsWith('qwen')) ?? m[0]) }) }
  useEffect(() => { if (engine === 'local') check() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine])
  useEffect(() => { store.set('kairotec:ai-engine', engine); store.set('kairotec:ai-model', model); store.set('kairotec:ai-device', devModel) }, [engine, model, devModel])
  useEffect(() => { if (engine === 'aparelho') deviceCached(devModel).then(c => setDevState(s => ({ ...s, cached: c || deviceReady(devModel) }))) }, [engine, devModel])
  const loadDevice = async () => {
    setDevState({ pct: 0, text: 'Preparando…' })
    try { await deviceLoad(devModel, (pct, text) => setDevState({ pct, text })); setDevState({ cached: true }); return true }
    catch (e) { setDevState({ err: (e as Error).message }); return false }
  }
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, busy])

  const ask = async (pedido: string, notas = false) => {
    if (!pedido.trim()) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', content: pedido }])
    if (engine === 'copilot') {
      await navigator.clipboard.writeText(copilotPrompt(data, pedido, notas)).catch(() => { /* sem área de transferência */ })
      setPending({ pedido, notas }); toast('Pergunta copiada · cole no Copilot (Ctrl+V)')
      return
    }
    setBusy('pensando')
    try {
      if (engine === 'aparelho' && !deviceReady(devModel)) { setBusy('carregando'); if (!(await loadDevice())) throw new Error('Não consegui carregar a IA neste aparelho'); setBusy('pensando') }
      const hist = msgs.map(x => ({ role: x.role, content: x.content }))
      const r = engine === 'aparelho' ? await deviceAsk(devModel, data, pedido, hist, notas) : await ollamaAsk(model, data, pedido, hist, notas)
      setMsgs(m => [...m, { role: 'assistant', content: r.resposta || '(sem resposta)', acoes: r.acoes }])
      setChecked(Object.fromEntries(r.acoes.map((_, i) => [`${msgs.length + 1}:${i}`, true])))
    } catch (e) { setMsgs(m => [...m, { role: 'assistant', content: `⚠ ${(e as Error).message}.${engine === 'local' ? ' O Ollama está aberto?' : ''}` }]) }
    finally { setBusy(null) }
  }
  const readPaste = () => {
    const r = parseReply(paste)
    setMsgs(m => [...m, { role: 'assistant', content: r.resposta || 'Não entendi a resposta — confira se o Copilot respondeu com o JSON.', acoes: r.acoes }])
    setChecked(Object.fromEntries(r.acoes.map((_, i) => [`${msgs.length}:${i}`, true])))
    setPaste(''); setPending(null)
  }
  const apply = (mi: number) => {
    const m = msgs[mi]; if (!m.acoes) return
    const chosen = m.acoes.filter((_, i) => checked[`${mi}:${i}`] !== false)
    if (!chosen.length) return
    replaceAll(applyActions(data, chosen))
    setMsgs(all => all.map((x, i) => i === mi ? { ...x, applied: true } : x))
    toast(`${chosen.length} ${chosen.length === 1 ? 'ação aplicada' : 'ações aplicadas'} ✨ · Ctrl+Z desfaz`)
  }

  const ready = engine === 'copilot' || engine === 'aparelho' || !!models?.length
  return <Page>
    <div className="head"><div><h1>Assistente</h1><p>Converse com suas tarefas, agenda e notas. Ele só sugere — você decide o que aplicar.</p></div><div className="sp" />
      <Seg value={engine} onChange={setEngine} options={[...(deviceSupported() ? [{ v: 'aparelho' as Engine, l: '✨ Neste aparelho' }] : []), ...(isPhone() ? [] : [{ v: 'local' as Engine, l: '💻 Ollama' }]), { v: 'copilot' as Engine, l: '🪟 Copilot' }]} /></div>
    <div className="ai">
      <div className="ai-chat card">
        <div className="ai-msgs scroll">
          {!msgs.length && <div className="ai-hello">
            <motion.div className="ai-orb" animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 3 }}>✨</motion.div>
            <b>Como posso ajudar hoje?</b><span className="muted">Escolha um atalho ou escreva do seu jeito.</span>
            <div className="ai-presets">{PRESETS.map(p => <motion.button key={p.l} whileHover={{ y: -2 }} whileTap={{ scale: .97 }} className="chip" disabled={!ready} onClick={() => ask(p.p, !!p.notas)}>{p.l}</motion.button>)}</div>
          </div>}
          <AnimatePresence initial={false}>{msgs.map((m, mi) => <motion.div key={mi} className={`ai-msg ${m.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <div className="ai-bubble">{m.content}</div>
            {!!m.acoes?.length && <div className={`ai-acts ${m.applied ? 'done' : ''}`}>
              {m.acoes.map((a, i) => <label key={i} className="ai-act"><input type="checkbox" disabled={m.applied} checked={checked[`${mi}:${i}`] !== false} onChange={e => setChecked(c => ({ ...c, [`${mi}:${i}`]: e.target.checked }))} /><span>{describe(data, a)}</span></label>)}
              {m.applied ? <div className="muted" style={{ fontSize: 12 }}>✓ Aplicado · Ctrl+Z para desfazer</div> : <Btn variant="sm primary" onClick={() => apply(mi)}><Icon n="check" s={14} /> Aplicar selecionadas</Btn>}
            </div>}
          </motion.div>)}</AnimatePresence>
          {busy && <div className="ai-msg assistant"><div className="ai-bubble ai-typing">{busy === 'carregando' ? <span className="muted">Preparando a IA… {devState.pct ?? 0}%</span> : <><i /><i /><i /></>}</div></div>}
          {pending && <motion.div className="ai-paste" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <b>1.</b> A pergunta já está copiada. <a href="https://m365.cloud.microsoft/chat" target="_blank" rel="noreferrer">Abra o Copilot</a>, cole (Ctrl+V) e envie.<br /><b>2.</b> Copie a resposta inteira do Copilot e cole aqui:
            <textarea className="input" rows={4} value={paste} onChange={e => setPaste(e.target.value)} placeholder='{"resposta": "...", "acoes": [...]}' />
            <div className="row" style={{ justifyContent: 'flex-end' }}><Btn variant="sm ghost" onClick={() => setPending(null)}>Cancelar</Btn><Btn variant="sm primary" disabled={!paste.trim()} onClick={readPaste}>Ler resposta</Btn></div>
          </motion.div>}
          <div ref={end} />
        </div>
        <form className="ai-input" onSubmit={e => { e.preventDefault(); ask(input) }}>
          <input className="input" placeholder={ready ? 'Ex.: o que eu deveria fazer hoje?' : 'Configure o modelo ao lado →'} value={input} onChange={e => setInput(e.target.value)} disabled={!ready || !!busy} />
          <Btn variant="primary" disabled={!ready || !input.trim() || !!busy}>Enviar</Btn>
        </form>
      </div>

      <div className="ai-side">
        {engine === 'aparelho' ? <Card title="IA neste aparelho" sub={devState.cached ? '● pronta' : '○ baixar uma vez'}>
          <div className="ai-steps">
            <p className="muted">Roda aqui dentro, de graça e sem internet depois de baixada. Funciona no PC e no celular.</p>
            <div className="field"><label>Modelo</label><select className="input" value={devModel} onChange={e => setDevModel(e.target.value)}>{DEVICE_MODELS.map(m => <option key={m.id} value={m.id}>{m.l} · {m.size}</option>)}</select></div>
            {devState.pct !== undefined ? <div><div className="ai-bar"><i style={{ width: `${devState.pct}%` }} /></div><small className="muted">{devState.pct}% · baixando (só na primeira vez)</small></div>
              : !devState.cached && <Btn variant="sm primary" onClick={loadDevice}>Baixar agora</Btn>}
            {devState.err && <p style={{ color: 'var(--bad)', fontSize: 13 }}>⚠ {devState.err}. Se continuar, use o modo Copilot.</p>}
          </div>
        </Card> : engine === 'local' ? <Card title="IA local · Ollama" sub={models === undefined ? 'verificando…' : models ? '● pronta' : '○ não encontrada'}>
          {models === null && <div className="ai-steps">
            <p className="muted">Roda no seu computador, sem internet e sem custo. Não precisa treinar nada — o modelo já vem pronto.</p>
            <ol><li><a href="https://ollama.com/download/windows" target="_blank" rel="noreferrer">Baixe o Ollama para Windows</a> e instale (normalmente não pede administrador; se a TI bloquear, use o modo Copilot).</li><li>Abra o Ollama (fica perto do relógio).</li><li>Volte aqui e clique em <b>Verificar</b>.</li></ol>
            <Btn variant="sm" onClick={check}>Verificar</Btn>
          </div>}
          {models && !models.length && <div className="ai-steps">
            <p className="muted">Ollama encontrado! Falta baixar um modelo (uma vez só, ~2 GB).</p>
            <Btn variant="sm primary" disabled={busy === 'baixando'} onClick={async () => { setBusy('baixando'); try { await ollamaPull(SUGGESTED_MODEL); toast('Modelo pronto ✨'); check() } catch (e) { toast((e as Error).message) } finally { setBusy(null) } }}>{busy === 'baixando' ? 'Baixando… (alguns minutos)' : `Baixar ${SUGGESTED_MODEL}`}</Btn>
          </div>}
          {!!models?.length && <div className="field"><label>Modelo</label><select className="input" value={model} onChange={e => setModel(e.target.value)}>{models.map(m => <option key={m}>{m}</option>)}</select>
            <div className="muted" style={{ fontSize: 12 }}>Recomendado: <b>{SUGGESTED_MODEL}</b> (leve, bom em português). Em PCs com 16 GB+: <b>qwen2.5:7b</b>.</div></div>}
        </Card> : <Card title="Copilot da empresa" sub="sem custo">
          <div className="ai-steps"><p className="muted">Usa o Copilot que a empresa já libera. O Kairotec prepara a pergunta com o contexto das suas tarefas e agenda; você cola no Copilot e cola a resposta de volta.</p>
            <ol><li>Escreva o pedido ou clique num atalho.</li><li>Cole no Copilot (já fica copiado).</li><li>Cole a resposta aqui e aplique.</li></ol></div>
        </Card>}
        <Card title="Privacidade" sub="" className="desk-only">
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{engine !== 'copilot' ? '🔒 Nada sai do seu aparelho.' : '🏢 O texto vai para o Copilot da sua conta da empresa, como qualquer conversa sua com ele.'} O assistente vê só tarefas abertas, agenda dos próximos 7 dias e — só quando você pede — as 5 notas mais recentes.</div>
        </Card>
      </div>
    </div>
  </Page>
}
