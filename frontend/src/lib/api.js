// When VITE_API_BASE_URL is set (e.g. http://localhost:4000) the paths below
// are appended to it.  When it is absent the Vite proxy forwards /api/* to
// the backend, so an empty base is correct — never use '/api' as the base.
const BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, { headers: extraHeaders = {}, ...rest } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    ...rest,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

function authHeaders(token) {
  if (!token || typeof token !== 'string' || token.length < 10) return {}
  return { Authorization: `Bearer ${token}` }
}

export const api = {
  getFeed: (tab = 'foryou', token) =>
    request(`/api/posts?tab=${tab}`, { headers: authHeaders(token) }),

  getPost: (id) =>
    request(`/api/posts/${id}`),

  createPost: (payload, token) =>
    request('/api/posts', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  castVote: (payload, token) =>
    request('/api/votes', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  incrementShare: (postId) =>
    request(`/api/posts/${postId}/share`, { method: 'POST' }),

  getMyVotes: (token) =>
    request('/api/votes/mine', { headers: authHeaders(token) }),

  upgradePlan: (plan, token) =>
    request('/api/users/plan', {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ plan }),
    }),

  requestAiVerdict: (postId, token) =>
    request(`/api/posts/${postId}/ai-verdict`, {
      method: 'POST',
      headers: authHeaders(token),
    }),

  requestFeature: (postId, token) =>
    request(`/api/posts/${postId}/feature`, {
      method: 'POST',
      headers: authHeaders(token),
    }),

  getUserProfile: (id) =>
    request(`/api/users/${id}`),

  createUserProfile: (payload, token) =>
    request('/api/users', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
}
