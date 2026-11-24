import { useStore } from '../lib/store'
import { Page, Card, Btn, Icon, Seg } from '../components/ui'
import { fsSupported, pickCloud, pickExcel, readCloud, forget, download, syncAll, regrant } from '../lib/sync'
import { buildWorkbook } from '../lib/excel'
import type { Data } from '../lib/types'

export const THEMES = [
  { id: 'cafe', name: 'Café', c: ['#0b0806', '#3d2a1c', '#f1dabf'] },
  { id: 'vinho', name: 'Vinho', c: ['#0a0708', '#5a1525', '#e2b46a'] },
  { id: 'oliva', name: 'Oliva', c: ['#080a07', '#2d3a1f', '#d8e3a5'] },
  { id: 'noite', name: 'Noite', c: ['#07080d', '#252d5e', '#b8c2ff'] },
  { id: 'creme', name: 'Creme', c: ['#f6efe6', '#fffbff', '#362417'] },
]

export default function Settings() {
  const { data, setSettings, sync, setSync, replaceAll, toast, upsertProject, removeProject } = useStore()
  const s = data.settings
  const fs = fsSupported()

  const connectCloud = async (mode: 'new' | 'open') => {
    try {
      const h = await pickCloud(mode)
      if (mode === 'open') { const d = await readCloud(); if (d && confirm('Carregar os dados deste arquivo? (substitui os dados atuais do app)')) replaceAll(d as Data) }
      else await syncAll(data)
      setSync({ cloudName: h.name }); toast('Arquivo de nuvem conectado')
    } catch { /* cancelado */ }
  }
  const connectExcel = async () => { try { const h = await pickExcel(); await syncAll(data); setSync({ excelName: h.name }); toast('Planilha conectada e atualizada') } catch { /* cancelado */ } }

  return <Page>
    <div className="head"><div><h1>Ajustes</h1><p>Aparência, sincronização e dados</p></div></div>
    <div className="settings"><div className="col-s">
      <Card title="Aparência">
        <div className="themes">{THEMES.map(t => <button key={t.id} className={`tsw ${s.theme === t.id ? 'on' : ''}`} onClick={() => setSettings({ theme: t.id })}>
          <div className="pv" style={{ background: t.c[0] }}><div style={{ background: t.c[1] }} /><div style={{ padding: 8, display: 'grid', gap: 5, alignContent: 'start' }}><i style={{ height: 6, width: '60%', borderRadius: 4, background: t.c[2] }} /><i style={{ height: 6, width: '80%', borderRadius: 4, background: t.c[1] }} /><i style={{ height: 6, width: '40%', borderRadius: 4, background: t.c[1] }} /></div></div>
          <b style={{ fontSize: 13 }}>{t.name}</b></button>)}</div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
          <div className="field"><label>Seu nome</label><input className="input" value={s.userName} onChange={e => setSettings({ userName: e.target.value })} placeholder="Como quer ser chamada?" /></div>
          <div className="field"><label>Semana começa</label><Seg value={String(s.weekStart) as '0' | '1'} onChange={v => setSettings({ weekStart: Number(v) as 0 | 1 })} options={[{ v: '1', l: 'Segunda' }, { v: '0', l: 'Domingo' }]} /></div>
        </div>
      </Card>

      <Card title="Nuvem & Excel" sub={sync.status === 'saving' ? 'salvando…' : sync.lastSaved ? `salvo às ${sync.lastSaved}` : ''}>
        {!fs && <div className="out" style={{ marginTop: 0, marginBottom: 12, color: 'var(--warn)' }}>Seu navegador não permite gravar direto em arquivos. Use Microsoft Edge ou Google Chrome — ou use os botões de exportar abaixo.</div>}
        {sync.error && <div className="out" style={{ marginTop: 0, marginBottom: 12, color: 'var(--bad)' }}>{sync.error} <Btn variant="sm" onClick={async () => { await regrant(); const r = await syncAll(data); setSync({ error: r.error, status: r.error ? 'error' : 'saved' }) }}>Tentar de novo</Btn></div>}
        <div className="list-row"><Icon n="cloud" /><div style={{ flex: 1 }}><b>Arquivo de dados (.json)</b><div className="muted" style={{ fontSize: 12 }}>Salve numa pasta do OneDrive/SharePoint: vira seu backup na nuvem e permite abrir em outro PC.</div>
          {sync.cloudName && <div className="mono" style={{ color: 'var(--ok)' }}>● {sync.cloudName}</div>}</div>
          {sync.cloudName ? <Btn variant="sm ghost" onClick={async () => { await forget('cloud'); setSync({ cloudName: undefined }) }}>Desconectar</Btn> : <>
            <Btn variant="sm" disabled={!fs} onClick={() => connectCloud('open')}>Abrir existente</Btn><Btn variant="sm primary" disabled={!fs} onClick={() => connectCloud('new')}>Criar</Btn></>}
        </div>
        <div className="list-row"><Icon n="sheet" /><div style={{ flex: 1 }}><b>Planilha Excel única (.xlsx)</b><div className="muted" style={{ fontSize: 12 }}>Tudo que você fizer aqui é reescrito automaticamente nessa planilha: Resumo, Planner de 3 meses, Tarefas, Agenda e Notas — formatada.</div>
          {sync.excelName && <div className="mono" style={{ color: 'var(--ok)' }}>● {sync.excelName}</div>}</div>
          {sync.excelName ? <Btn variant="sm ghost" onClick={async () => { await forget('excel'); setSync({ excelName: undefined }) }}>Desconectar</Btn> : <Btn variant="sm primary" disabled={!fs} onClick={connectExcel}>Escolher arquivo</Btn>}
        </div>
        <div className="row wrap" style={{ marginTop: 14, gap: 18 }}>
          <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={s.autoCloud} onChange={e => setSettings({ autoCloud: e.target.checked })} /> Salvar dados automaticamente</label>
          <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={s.autoExcel} onChange={e => setSettings({ autoExcel: e.target.checked })} /> Atualizar planilha automaticamente</label>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Dica: se a planilha estiver aberta no Excel o Windows bloqueia a gravação; o app avisa e tenta de novo na próxima alteração.</div>
      </Card>

      </div><div className="col-s">
      <Card title="Projetos">
        {data.projects.map(p => <div key={p.id} className="list-row">
          <input type="color" value={p.color} onChange={e => upsertProject({ id: p.id, color: e.target.value })} style={{ width: 28, height: 28, border: 0, background: 'none', padding: 0 }} />
          <input className="input" value={p.name} onChange={e => upsertProject({ id: p.id, name: e.target.value })} style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 12, width: 80 }}>{data.tasks.filter(t => t.projectId === p.id).length} tarefas</span>
          <Btn variant="ghost icon" onClick={() => confirm(`Remover projeto "${p.name}"?`) && removeProject(p.id)}><Icon n="trash" /></Btn></div>)}
        <Btn variant="sm" style={{ marginTop: 10 }} onClick={() => upsertProject({ name: 'Novo projeto', color: ['#5b8def', '#e0a458', '#6fbf8e', '#c97b9b', '#9b7fd1', '#4fb3b3', '#d0705a'][data.projects.length % 7] })}><Icon n="plus" /> Projeto</Btn>
      </Card>

      <Card title="Exportar & importar">
        <div className="row wrap">
          <Btn onClick={async () => download(await buildWorkbook(data), 'Kairotec-Planner.xlsx')}><Icon n="sheet" /> Baixar .xlsx</Btn>
          <Btn onClick={() => download(new Blob([JSON.stringify(data, null, 2)]), `kairotec-backup-${new Date().toISOString().slice(0, 10)}.json`)}><Icon n="download" /> Backup .json</Btn>
          <label className="btn"><Icon n="cloud" /> Importar .json<input type="file" accept=".json" hidden onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (confirm('Substituir todos os dados atuais?')) { replaceAll(d); toast('Dados importados') } } catch { toast('Arquivo inválido') } }} /></label>
          <Btn variant="ghost" style={{ color: 'var(--bad)', marginLeft: 'auto' }} onClick={() => { if (confirm('Apagar TODOS os dados locais? (o arquivo de nuvem não é apagado)')) { localStorage.removeItem('kairotec:data'); location.reload() } }}>Resetar app</Btn>
        </div>
      </Card>
    </div></div>
  </Page>
}
