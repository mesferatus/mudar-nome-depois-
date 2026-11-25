import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import QRCode from 'qrcode'
import { useStore } from '../lib/store'
import { Btn, Card, Icon } from './ui'
import { isDesktop, syncOutlook, syncIcsUrl, importFromNotionApi, addImported } from '../lib/integrations'
import { importNotionZip } from '../lib/notion'
import { pairCode, applyPairCode, syncConnected, pullSync } from '../lib/cloudsync'

const WEB_URL = (import.meta.env.VITE_WEB_URL as string | undefined) ?? `${location.origin}${import.meta.env.BASE_URL}`

const ago = (iso?: string) => {
  if (!iso) return 'nunca'
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : `há ${Math.round(m / 60)}h`
}

/** Conexões: Outlook, celular (QR), Notion e opções do app de desktop. */
export function Connections() {
  const { data, replaceAll, setSettings, toast } = useStore()
  const s = data.settings, desk = isDesktop()
  const [busy, setBusy] = useState<string | null>(null)
  const [qr, setQr] = useState<string>()
  const [code, setCode] = useState('')
  const [ics, setIcs] = useState(s.icsUrl ?? '')
  const [notionToken, setNotionToken] = useState('')
  const [prog, setProg] = useState(0)
  const [prefs, setPrefs] = useState<{ startup?: boolean; tray?: boolean; version?: string }>({})
  useEffect(() => { window.kairotecDesktop?.prefs().then(setPrefs) }, [])

  const run = async (k: string, fn: () => Promise<void>) => { setBusy(k); try { await fn() } catch (e) { toast((e as Error).message) } finally { setBusy(null) } }
  const outlookNow = () => run('outlook', async () => {
    const r = await syncOutlook(data)
    if (r.error) { toast(r.error); return }
    replaceAll(r.data!); toast(`Outlook sincronizado · ${r.count} compromissos`)
  })
  const outlookEvents = data.events.filter(e => e.source === 'outlook').length
  const icsEvents = data.events.filter(e => e.source === 'ics').length

  return <>
    <Card title="Outlook" sub={desk ? (s.outlookAuto ? `automático · ${ago(s.lastOutlookSync)}` : '') : 'no app de desktop'}>
      {desk ? <>
        <div className="list-row"><span className="cx-ic">📅</span><div style={{ flex: 1 }}><b>Agenda do Outlook deste computador</b>
          <div className="muted" style={{ fontSize: 12 }}>Lê direto do Outlook instalado — sem senha e sem precisar da TI. Traz de 7 dias atrás até 90 dias à frente, incluindo reuniões que se repetem. {outlookEvents ? `${outlookEvents} compromissos sincronizados.` : ''}</div></div>
          <Btn variant="sm" disabled={busy === 'outlook'} onClick={outlookNow}>{busy === 'outlook' ? 'Lendo…' : 'Sincronizar agora'}</Btn></div>
        <label className="list-row" style={{ cursor: 'pointer' }}><input type="checkbox" checked={!!s.outlookAuto} onChange={e => { setSettings({ outlookAuto: e.target.checked }); if (e.target.checked) outlookNow() }} />
          <div style={{ flex: 1 }}><b>Sincronizar sozinho a cada 15 minutos</b><div className="muted" style={{ fontSize: 12 }}>As reuniões aparecem no Calendário, no "Seu dia" e nos lembretes. Você pode ligar cada uma a um projeto.</div></div></label>
      </> : <div className="muted" style={{ fontSize: 13 }}>A leitura automática do Outlook funciona no <b>app de desktop (.exe)</b>. Aqui no navegador, use a assinatura de link abaixo ou importe um arquivo .ics.</div>}
      <div className="list-row" style={{ alignItems: 'flex-start' }}><span className="cx-ic">🔗</span><div style={{ flex: 1 }}><b>Assinar link de calendário (.ics)</b>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Para o "novo Outlook" ou Outlook na web: Configurações → Calendário → Calendários compartilhados → <i>Publicar um calendário</i> → copie o link ICS. Atualiza a cada 30 min. {icsEvents ? `${icsEvents} eventos.` : ''}</div>
        <div className="row"><input className="input" placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics" value={ics} onChange={e => setIcs(e.target.value)} />
          <Btn variant="sm" disabled={!ics.trim() || busy === 'ics'} onClick={() => run('ics', async () => { const r = await syncIcsUrl(data, ics); if (r.error) { toast(r.error); return } replaceAll({ ...r.data!, settings: { ...r.data!.settings, icsUrl: ics.trim() } }); toast(`${r.count} eventos do link`) })}>{busy === 'ics' ? '…' : 'Assinar'}</Btn>
          {s.icsUrl && <Btn variant="sm ghost" onClick={() => { replaceAll({ ...data, events: data.events.filter(e => e.source !== 'ics'), settings: { ...s, icsUrl: undefined } }); setIcs(''); toast('Assinatura removida') }}>Remover</Btn>}
        </div></div></div>
    </Card>

    <Card title="Celular" sub={syncConnected() ? '● sincronização ligada' : ''}>
      {syncConnected() ? <>
        <div className="list-row" style={{ alignItems: 'flex-start' }}><span className="cx-ic">📱</span><div style={{ flex: 1 }}><b>Conectar o celular com um código</b>
          <div className="muted" style={{ fontSize: 12 }}>Gere o código, aponte a câmera do celular para o QR e toque no link: o Kairotec abre no celular já com tudo seu. Depois, no celular: menu → <i>Adicionar à tela inicial</i>.</div></div>
          <Btn variant="sm primary" onClick={async () => { if (qr) { setQr(undefined); return } const c = pairCode(); if (!c) return; setCode(c); setQr(await QRCode.toDataURL(`${WEB_URL}#conectar=${c}`, { margin: 1, width: 260, color: { dark: '#1a120d', light: '#fffbff' } })) }}>{qr ? 'Esconder' : 'Gerar código'}</Btn></div>
        <AnimatePresence>{qr && <motion.div className="pair" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <img src={qr} alt="QR code para conectar o celular" width={200} height={200} />
          <div><b>Ou digite no celular</b><div className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>Ajustes → Celular → "Tenho um código"</div>
            <code className="pair-code">{code}</code>
            <Btn variant="sm" onClick={() => { navigator.clipboard.writeText(code); toast('Código copiado') }}>Copiar código</Btn>
            <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>⚠ O código dá acesso aos seus dados — mostre só nos seus aparelhos.</div></div>
        </motion.div>}</AnimatePresence>
      </> : <div className="muted" style={{ fontSize: 13 }}>Primeiro ligue a <b>sincronização</b> no cartão "Sincronizar entre aparelhos". Depois é só gerar o código aqui.</div>}
      <div className="list-row"><span className="cx-ic">🔑</span><div style={{ flex: 1 }}><b>Tenho um código</b><div className="muted" style={{ fontSize: 12 }}>Cole o código gerado no outro aparelho.</div></div></div>
      <div className="row"><input className="input" placeholder="KT1.…" onKeyDown={async e => {
        if (e.key !== 'Enter') return
        if (!applyPairCode(e.currentTarget.value)) { toast('Código inválido'); return }
        const remote = await pullSync(data).catch(() => undefined); if (remote) replaceAll(remote)
        toast('Conectado ✨ seus dados chegaram'); e.currentTarget.value = ''
      }} /></div>
    </Card>

    <Card title="Notion" sub="trazer páginas e bancos de dados">
      <div className="list-row" style={{ alignItems: 'flex-start' }}><span className="cx-ic">📥</span><div style={{ flex: 1 }}><b>Importar arquivo exportado</b>
        <div className="muted" style={{ fontSize: 12 }}>No Notion: ⋯ (no topo) → Exportar → <i>Markdown & CSV</i>, com subpáginas. Escolha o .zip aqui. Páginas, subpáginas, links e bancos de dados entram no caderno.</div></div>
        <label className="btn sm">{busy === 'zip' ? 'Importando…' : 'Escolher .zip'}<input type="file" accept=".zip" hidden onChange={e => { const f = e.target.files?.[0]; if (!f) return; run('zip', async () => { const notes = await importNotionZip(f); replaceAll(addImported(data, notes)); toast(`${notes.length} páginas importadas do Notion ✨`) }); e.target.value = '' }} /></label></div>
      <div className="list-row" style={{ alignItems: 'flex-start' }}><span className="cx-ic">⚡</span><div style={{ flex: 1 }}><b>Conectar direto (app de desktop)</b>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>1. Em <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer">notion.so/my-integrations</a> crie uma integração interna e copie o token. 2. No Notion, abra as páginas → ⋯ → <i>Conexões</i> → adicione a integração. 3. Cole o token aqui.</div>
        <div className="row"><input className="input" type="password" placeholder="ntn_… ou secret_…" value={notionToken} onChange={e => setNotionToken(e.target.value)} disabled={!desk} />
          <Btn variant="sm primary" disabled={!desk || !notionToken.trim() || busy === 'notion'} onClick={() => run('notion', async () => {
            setProg(0); const notes = await importFromNotionApi(notionToken, setProg)
            replaceAll(addImported(data, notes)); setNotionToken(''); toast(`${notes.length} páginas trazidas do Notion ✨`)
          })}>{busy === 'notion' ? `Trazendo… ${prog}` : 'Trazer páginas'}</Btn></div>
        {!desk && <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>O navegador bloqueia a API do Notion; use o .exe ou o arquivo exportado.</div>}</div></div>
    </Card>

    {desk && <Card title="App de desktop" sub={prefs.version ? `versão ${prefs.version}` : ''}>
      <label className="list-row" style={{ cursor: 'pointer' }}><input type="checkbox" checked={!!prefs.startup} onChange={async e => setPrefs(await window.kairotecDesktop!.prefs({ startup: e.target.checked }))} />
        <div style={{ flex: 1 }}><b>Abrir junto com o Windows</b><div className="muted" style={{ fontSize: 12 }}>Inicia minimizado na bandeja, perto do relógio.</div></div></label>
      <label className="list-row" style={{ cursor: 'pointer' }}><input type="checkbox" checked={prefs.tray !== false} onChange={async e => setPrefs(await window.kairotecDesktop!.prefs({ tray: e.target.checked }))} />
        <div style={{ flex: 1 }}><b>Fechar = esconder na bandeja</b><div className="muted" style={{ fontSize: 12 }}>O app continua rodando para lembretes e sincronização. Para sair: botão direito no ícone → Sair.</div></div></label>
      <div className="list-row"><Icon n="bolt" /><div style={{ flex: 1 }}><b>Atalho de qualquer lugar: Ctrl + Alt + K</b><div className="muted" style={{ fontSize: 12 }}>Abre a criação rápida mesmo com o app minimizado.</div></div></div>
    </Card>}
  </>
}
