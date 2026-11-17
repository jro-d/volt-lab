/**
 * The saved light/dark preference. The app used to be called VoltLab and stored it under
 * "voltlab-theme"; the first read after the rename copies that value to the new key and drops the old one.
 * index.html runs the same steps before first paint (it cannot import this module).
 */
export const THEME_KEY = 'wirewise-theme';
export const LEGACY_THEME_KEY = 'voltlab-theme';

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readSavedTheme(store: KeyValueStore): 'dark' | 'light' | null {
  try {
    let saved = store.getItem(THEME_KEY);
    if (!saved) {
      const old = store.getItem(LEGACY_THEME_KEY);
      if (old) {
        store.setItem(THEME_KEY, old);
        store.removeItem(LEGACY_THEME_KEY);
        saved = old;
      }
    }
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    return null;
  }
}

export function saveTheme(store: KeyValueStore, theme: 'dark' | 'light'): void {
  try {
    store.setItem(THEME_KEY, theme);
    store.removeItem(LEGACY_THEME_KEY);
  } catch {
    /* storage unavailable: theme lasts for this visit only */
  }
}
