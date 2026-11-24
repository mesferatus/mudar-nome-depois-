/** Pedido de "abrir esta página" vindo da busca, consumido pela tela de Notas (mesmo se ela ainda não montou). */
let pending: string | undefined
export const requestNote = (id: string) => { pending = id; window.dispatchEvent(new CustomEvent('kairotec:open-note', { detail: id })) }
export const takeNote = () => { const p = pending; pending = undefined; return p }
