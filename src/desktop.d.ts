interface Window {
  /** Presente só no app de desktop (.exe). */
  kairotecDesktop?: {
    isDesktop: true
    onUpdateReady: (cb: (version: string) => void) => void
    restart: () => void
    onQuick: (cb: () => void) => void
    prefs: (p?: Record<string, unknown>) => Promise<{ startup?: boolean; tray?: boolean; version?: string }>
    outlook: () => Promise<{ ok: boolean; items?: import('./lib/outlook').OutlookItem[]; error?: string }>
    fetch: (req: { url: string; method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; text: string }>
  }
}
