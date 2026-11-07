export const API_BASE_URL = '/api/v1';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase())) {
    const csrf = await fetch(`${API_BASE_URL}/csrf`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!csrf.ok) throw new ApiError('No se pudo validar la sesión.', csrf.status);
    headers.set('X-CSRF-TOKEN', (await csrf.json()).token);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new ApiError(`Error en el servidor (${response.status})`, response.status);
    }
    throw new ApiError('El servidor devolvió una respuesta inesperada.', response.status);
  }

  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('erp:unauthorized'));
    }
    const details = result.errors ? Object.values(result.errors).flat().join(' ') : '';
    throw new ApiError(details || result.error || result.message || `Error ${response.status}`, response.status);
  }

  return result;
}

export function mutate<T = any>(endpoint: string, data: unknown, key: string, method = 'POST'): Promise<T> {
  return apiFetch<T>(endpoint, {
    method,
    headers: { 'Idempotency-Key': key },
    body: JSON.stringify(data),
  });
}
