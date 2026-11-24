interface Window {
  /** Presente só no app de desktop (.exe). */
  kairotecDesktop?: { isDesktop: true; onUpdateReady: (cb: (version: string) => void) => void; restart: () => void }
}
