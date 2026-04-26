const STORAGE_KEY = 'flowdesk-theme';

/** @returns {'dark' | 'light'} */
export function getTheme() {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'light' || v === 'dark') return v;
    } catch {
        /* ignore */
    }
    return 'dark';
}

export function applyTheme(mode) {
    const m = mode === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', m);
}

/** Persist and apply. */
export function setTheme(mode) {
    const m = mode === 'light' ? 'light' : 'dark';
    try {
        localStorage.setItem(STORAGE_KEY, m);
    } catch {
        /* ignore */
    }
    applyTheme(m);
}

/** Call once on app load (e.g. main.jsx) */
export function initTheme() {
    applyTheme(getTheme());
}
