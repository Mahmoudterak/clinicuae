import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState<{ token: string; name: string; username: string } | null>(() => {
    try {
      const auth = localStorage.getItem('sa-auth');
      return auth ? JSON.parse(auth) : null;
    } catch {
      return null;
    }
  });

  const login = (data: { token: string; name: string; username: string }) => {
    localStorage.setItem('sa-auth', JSON.stringify(data));
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem('sa-auth');
    setUser(null);
  };

  return { user, login, logout, isAuthenticated: !!user };
}
