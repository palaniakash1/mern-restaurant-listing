import { buildCsrfHeaders } from '../utils/http';

export const signin = async (email, password) => {
  const res = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
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
  const data = await res.json();
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Google signin failed');
  }
  return data;
};

export const validateSession = async () => {
  const res = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include',
    headers: buildCsrfHeaders()
  });
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  return data.data || data;
};

export const signout = async () => {
  const res = await fetch('/api/auth/signout', {
    method: 'POST',
    credentials: 'include',
    headers: buildCsrfHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Signout failed');
  }
  return data;
};
