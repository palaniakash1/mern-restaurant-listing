import { buildCsrfHeaders } from '../utils/http';

let refreshSessionPromise = null;

const parseJsonSafely = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const signin = async (email, password) => {
  const res = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(data.message || 'Signin failed');
  }
  return data;
};

export const signup = async (userData) => {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(userData)
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(data.message || 'Signup failed');
  }
  return data;
};

export const googleSignIn = async (googleData) => {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(googleData)
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(data.message || 'Google signin failed');
  }
  return data;
};

export const refreshSession = async () => {
  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: buildCsrfHeaders()
      });
      const data = await parseJsonSafely(res);

      if (!res.ok) {
        return null;
      }

      return data;
    })().finally(() => {
      refreshSessionPromise = null;
    });
  }

  return refreshSessionPromise;
};

export const validateSession = async (options = {}) => {
  const { retryOnUnauthorized = true } = options;
  const res = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include',
    headers: buildCsrfHeaders()
  });

  if (res.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshSession();

    if (refreshed) {
      return validateSession({ retryOnUnauthorized: false });
    }
  }

  if (!res.ok) {
    return null;
  }
  const data = await parseJsonSafely(res);
  return data.data || data;
};

export const signout = async () => {
  const res = await fetch('/api/auth/signout', {
    method: 'POST',
    credentials: 'include',
    headers: buildCsrfHeaders()
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(data.message || 'Signout failed');
  }
  return data;
};

export const forgotPassword = async (email) => {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email })
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(data.message || 'Failed to send reset email');
  }
  return data;
};

export const resetPassword = async (userId, token, newPassword) => {
  const res = await fetch(`/api/auth/reset-password/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token, password: newPassword })
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(data.message || 'Failed to reset password');
  }
  return data;
};
