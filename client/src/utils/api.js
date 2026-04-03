import { buildCsrfHeaders } from './http';
import { refreshSession } from '../services/authService';

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

const createHttpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const isAuthRefreshRequest = (url) =>
  typeof url === 'string' && url.startsWith('/api/auth/refresh');

const runRequest = async (url, options = {}) => {
  const {
    method = 'GET',
    body,
    headers = {},
    includeCsrf = method !== 'GET',
    ...rest
  } = options;

  const isJsonBody = body !== undefined && body !== null && !(body instanceof FormData);
  const requestHeaders = includeCsrf ? buildCsrfHeaders(headers) : headers;

  if (isJsonBody && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: requestHeaders,
    body: isJsonBody ? JSON.stringify(body) : body,
    ...rest
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw createHttpError(payload?.message || 'Request failed', response.status);
  }

  return payload;
};

export const apiRequest = async (url, options = {}) => {
  try {
    return await runRequest(url, options);
  } catch (error) {
    if (error.status !== 401 || isAuthRefreshRequest(url)) {
      throw error;
    }

    const refreshed = await refreshSession();
    if (!refreshed) {
      throw error;
    }

    return runRequest(url, options);
  }
};

export const apiGet = (url, options = {}) =>
  apiRequest(url, { ...options, method: 'GET', includeCsrf: false });

export const apiPost = (url, body, options = {}) =>
  apiRequest(url, { ...options, method: 'POST', body });

export const apiPatch = (url, body, options = {}) =>
  apiRequest(url, { ...options, method: 'PATCH', body });

export const apiPut = (url, body, options = {}) =>
  apiRequest(url, { ...options, method: 'PUT', body });

export const apiDelete = (url, options = {}) =>
  apiRequest(url, { ...options, method: 'DELETE' });
