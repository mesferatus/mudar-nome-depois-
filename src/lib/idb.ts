// Minimal IndexedDB key-value store (used to persist file handles between sessions)
const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open('kairotec', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('kv')
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
})
export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await open()
  return new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) })
}
export async function kvSet(key: string, val: unknown) {
  const db = await open()
  return new Promise<void>((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(val, key); t.oncomplete = () => res(); t.onerror = () => rej(t.error) })
}
export async function kvDel(key: string) {
  const db = await open()
  return new Promise<void>((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(key); t.oncomplete = () => res() })
}
