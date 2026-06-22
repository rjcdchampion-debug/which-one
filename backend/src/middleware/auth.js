function decodeJWT(token) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8')
  return JSON.parse(payload)
}

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Missing auth token' })
  try {
    const payload = decodeJWT(token)
    if (!payload.sub) throw new Error('No user id in token')
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Token expired' })
    }
    req.user = { id: payload.sub }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = { authMiddleware }
