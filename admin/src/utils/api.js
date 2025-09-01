// admin/src/utils/api.js
// Simple fetch wrapper that targets CRA proxy (/api -> http://localhost:5001)

export async function apiFetch(path, { method = 'GET', headers = {}, body } = {}) {
  // Attach bearer from localStorage if present
  try {
    const raw = localStorage.getItem('admin_auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token && !headers.Authorization) {
        headers = { ...headers, Authorization: `Bearer ${parsed.token}` };
      }
    }
  } catch {}

  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson ? payload?.error || 'Request failed' : payload;
    if (res.status === 401) {
      // Clear session and redirect to login
      try { localStorage.removeItem('admin_auth'); } catch {}
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
    throw new Error(message);
  }

  return payload;
}
