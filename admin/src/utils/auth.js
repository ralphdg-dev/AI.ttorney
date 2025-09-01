// admin/src/utils/auth.js
import { apiFetch } from './api';

export async function login(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function getMe(accessToken) {
  return apiFetch('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
