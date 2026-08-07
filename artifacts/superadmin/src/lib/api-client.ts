export const API_BASE = '/api/superadmin';

export function getAuthToken() {
  try {
    const auth = localStorage.getItem('sa-auth');
    if (auth) {
      return JSON.parse(auth).token;
    }
  } catch (e) {}
  return null;
}

export async function fetchApi(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'حدث خطأ غير متوقع';
    try {
      const errData = await response.json();
      message = errData.message || message;
    } catch {}
    
    if (response.status === 401) {
      localStorage.removeItem('sa-auth');
      window.location.reload(); // Simple way to force a redirect to login via App router
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}
