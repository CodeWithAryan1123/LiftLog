import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../utils/api';

const API = `${API_BASE}/api/auth`;
const TOKEN_KEY = 'liftlog-token';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

/** Return the stored JWT (or null). */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage may be unavailable in some contexts.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, verify the saved session
  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/me`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Invalid session');
        }

        let data;
        try {
          data = await res.json();
        } catch (e) {
          const text = await res.text().catch(() => null);
          data = text ? { message: text } : {};
        }

        if (!cancelled) {
          setUser(data);
        }
      } catch {
        // Token is invalid / expired — clear it.
        saveToken(null);
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    verifySession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      const text = await res.text().catch(() => null);
      data = text ? { error: text } : {};
    }

    if (!res.ok) throw new Error(data.error || 'Login failed');
    saveToken(data.token);
    setUser(data.user);
    return data;
  }

  async function signup(name, email, password) {
    const res = await fetch(`${API}/signup`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      const text = await res.text().catch(() => null);
      data = text ? { error: text } : {};
    }

    if (!res.ok) throw new Error(data.error || 'Signup failed');
    saveToken(data.token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    const token = getToken();
    try {
      await fetch(`${API}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } finally {
      saveToken(null);
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}
