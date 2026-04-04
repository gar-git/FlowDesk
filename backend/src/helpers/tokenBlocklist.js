// In-memory store (swap for Redis in production)
const blocklist = new Set();

export const blockToken = (token) => blocklist.add(token);
export const isTokenBlocked = (token) => blocklist.has(token);