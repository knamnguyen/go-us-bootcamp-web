export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Only allow proxying from known social media CDN domains
  const allowed = [
    'lookaside.fbsbx.com',
    'scontent.cdninstagram.com',
    'static.cdninstagram.com',
    'media.licdn.com',
    'scontent-',
    'fbcdn.net',
  ];

  let hostname;
  try {
    hostname = new URL(imageUrl).hostname;
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  if (!allowed.some((d) => hostname.includes(d))) {
    return new Response('Domain not allowed', { status: 403 });
  }

  try {
    const resp = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1',
        Accept: 'image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!resp.ok) {
      return new Response('Failed to fetch image', { status: 502 });
    }

    const contentType = resp.headers.get('content-type') || 'image/jpeg';

    // Make sure we're actually getting an image
    if (!contentType.startsWith('image/')) {
      return new Response('Not an image', { status: 502 });
    }

    return new Response(resp.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Proxy error', { status: 502 });
  }
}
