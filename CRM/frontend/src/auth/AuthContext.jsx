import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, setAuthToken, setUnauthorizedHandler } from '../api/client';
import { queryClient } from '../api/queryClient';

const storageKey = 'crm.activeSession';
const sessionMessageKey = 'crm.sessionMessage';
const sessionExpiredMessage = 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى';

const defaultState = {
  user: null,
  token: null,
};

const AuthContext = createContext(undefined);

function parseStoredState() {
  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        user: parsed.user ?? null,
        token: parsed.token ?? null,
      };
    }
  } catch (error) {
    console.warn('Unable to read stored auth state', error);
  }

  return defaultState;
}

export const AuthProvider = ({ children }) => {
  const isMountedRef = useRef(false);
  const [authState, setAuthState] = useState(() => {
    const parsed = parseStoredState();
    setAuthToken(parsed.token ?? null);
    return parsed;
  });
  const [sessionMessage, setSessionMessage] = useState(() => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(sessionMessageKey);
  });
  const { user, token } = authState;

  const clearAuthState = useCallback(({ message = null } = {}) => {
    setAuthToken(null);
    queryClient.clear();
    setAuthState(defaultState);

    try {
      window.localStorage.removeItem(storageKey);
      if (message) {
        window.sessionStorage.setItem(sessionMessageKey, message);
      } else {
        window.sessionStorage.removeItem(sessionMessageKey);
      }
    } catch (error) {
      console.warn('Unable to clear auth state', error);
    }

    setSessionMessage(message);
  }, []);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuthState({ message: sessionExpiredMessage });
    });
    return () => setUnauthorizedHandler(null);
  }, [clearAuthState]);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    try {
      if (user && token) {
        window.localStorage.setItem(storageKey, JSON.stringify({ user, token }));
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn('Unable to persist auth state', error);
    }
  }, [user, token]);

  const login = useCallback(async ({ email, password }) => {
    const { data: result, response } = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    const headerToken =
      response.headers.get('Authorization') ||
      response.headers.get('authorization') ||
      response.headers.get('X-Auth-Token');
    const tokenFromBody =
      (result && typeof result === 'object' && (result.access_token || result.token || result.jwt)) || null;
    const normalizedHeaderToken =
      headerToken && headerToken.startsWith('Bearer ') ? headerToken.replace(/^Bearer\s+/i, '') : headerToken;
    const resolvedToken = tokenFromBody || normalizedHeaderToken;

    const resolvedUser =
      (result && typeof result === 'object' && (result.user || result.data || result.payload)) || result || null;

    if (!resolvedToken) {
      throw new Error('Login response did not include an access token.');
    }

    setAuthToken(resolvedToken);
    setSessionMessage(null);
    try {
      window.sessionStorage.removeItem(sessionMessageKey);
    } catch (error) {
      console.warn('Unable to clear session message', error);
    }
    setAuthState({
      user: resolvedUser,
      token: resolvedToken,
    });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['visits'] });

    return resolvedUser;
  }, []);

  const logout = useCallback(() => {
    clearAuthState();
  }, [clearAuthState]);

  const value = useMemo(
    () => ({
      user,
      token,
      sessionMessage,
      login,
      logout,
    }),
    [user, token, sessionMessage, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
