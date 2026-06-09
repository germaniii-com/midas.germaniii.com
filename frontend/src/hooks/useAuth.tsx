import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { login, register, getMe, type User, type AuthResponse } from '../api/auth';
import { getToken, setToken } from '../api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    getMe(token)
      .then(setUser)
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const res = await login(email, password);
    setToken(res.token);
    setUser(res.user);
    return res;
  }, []);

  const handleRegister = useCallback(async (email: string, password: string) => {
    const res = await register(email, password);
    setToken(res.token);
    setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
