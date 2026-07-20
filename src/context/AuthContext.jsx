import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../utils/api';

const API = `${API_BASE}/api/auth`;

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, verify the cookie-backed session
  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      try {
        const res = await fetch(`${API}/me`, {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Invalid session');
        }

        // Parse JSON safely — some deployment responses may have empty bodies.
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
    setUser(data.user);
    return data;
  }

  async function logout() {
    try {
      await fetch(`${API}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}
