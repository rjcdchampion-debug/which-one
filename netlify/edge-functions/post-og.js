// Intercepts /post/:id requests, fetches post data from the backend, and
// injects Open Graph meta tags into the HTML before returning it.
// Social crawlers (WhatsApp, iMessage, Twitter) never execute JS, so this
// server-side injection is the only way to generate rich preview cards.

function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default async function handler(req, context) {
  const url = new URL(req.url)
  const postId = url.pathname.split('/').filter(Boolean).pop()

  if (!postId) return context.next()

  const apiBase = Deno.env.get('VITE_API_BASE_URL') ?? ''
  const postUrl = `${url.origin}/post/${postId}`

  let title       = 'This or That?'
  let description = 'Vote now on This or That and help decide!'
  let image       = ''

  try {
    const apiRes = await fetch(`${apiBase}/api/posts/${postId}`)
    if (apiRes.ok) {
      const { post } = await apiRes.json()
      if (post) {
        title = post.question || title
        image = post.options?.[0]?.photo_url || ''
      }
    }
  } catch { /* fall through with defaults */ }

  // Serve the SPA's index.html (via the /* → /index.html _redirects rule)
  const spaResponse = await context.next()
  const html = await spaResponse.text()

  const ogTags = [
    `<meta property="og:type"        content="website" />`,
    `<meta property="og:title"       content="${escAttr(title)}" />`,
    `<meta property="og:description" content="${escAttr(description)}" />`,
    `<meta property="og:url"         content="${escAttr(postUrl)}" />`,
    image ? `<meta property="og:image"       content="${escAttr(image)}" />` : '',
    `<meta name="twitter:card"        content="summary_large_image" />`,
    `<meta name="twitter:title"       content="${escAttr(title)}" />`,
    `<meta name="twitter:description" content="${escAttr(description)}" />`,
    image ? `<meta name="twitter:image"       content="${escAttr(image)}" />` : '',
  ].filter(Boolean).join('\n    ')

  const modified = html.replace('</head>', `  ${ogTags}\n  </head>`)

  return new Response(modified, {
    status: spaResponse.status,
    headers: {
      ...Object.fromEntries(spaResponse.headers),
      'content-type': 'text/html; charset=utf-8',
    },
  })
}

export const config = { path: '/post/*' }
