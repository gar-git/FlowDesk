/** Default backend in local dev (matches Vite `proxy` target in vite.config.js). */
const DEFAULT_DEV_BACKEND = 'http://localhost:4000';

/**
 * Base URL for Socket.IO (no path). The API may live at e.g. /api on the same host, but
 * socket.io is served from the server root.
 *
 * - Optional `VITE_SOCKET_URL` wins if set.
 * - If `VITE_FRONTEND_API_URL` is an absolute http(s) URL, use its origin.
 * - In dev, default to the local Express port so a relative `/api` still finds the socket server.
 * - In production, same origin as the page is typical when the app is behind one host.
 */
export function getSocketBaseUrl() {
    const explicit = import.meta.env.VITE_SOCKET_URL;
    if (explicit && typeof explicit === 'string') {
        return explicit.replace(/\/$/, '');
    }

    const api = import.meta.env.VITE_FRONTEND_API_URL;
    if (api && /^https?:\/\//i.test(api)) {
        try {
            return new URL(api).origin;
        } catch {
            // fall through
        }
    }

    if (import.meta.env.DEV) {
        return DEFAULT_DEV_BACKEND;
    }

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return DEFAULT_DEV_BACKEND;
}
