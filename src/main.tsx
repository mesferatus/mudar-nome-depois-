import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Atualização automática: o app verifica se há versão nova ao abrir, ao voltar para a aba e a cada 30 min.
// Quando a versão nova assume, avisa com um botão para recarregar (os dados ficam no aparelho e não se perdem).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      const check = () => reg.update().catch(() => { /* offline */ })
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
      setInterval(check, 30 * 60 * 1000)
      let had = !!navigator.serviceWorker.controller
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) window.dispatchEvent(new Event('kairotec:update')); had = true })
    } catch { /* sem modo offline */ }
  })
}
