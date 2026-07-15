const configuredApiUrl = import.meta.env.VITE_API_URL;

// In production, require an explicit backend URL to avoid broken host-based fallbacks.
const fallbackApiUrl = import.meta.env.DEV ? 'http://localhost:5000' : '';

export const API_BASE = (configuredApiUrl || fallbackApiUrl).replace(/\/$/, '');
