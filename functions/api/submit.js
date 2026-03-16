const KEYWORDS = [
  'gousentrecamp',
  'gous-entrecamp',
  'go-us entrepreneur bootcamp',
  'go us entrepreneur bootcamp',
  'go us entrecamp',
  'gous entrecamp',
  'go-us entrecamp',
  'go-us bootcamp',
  'go us bootcamp',
  'gous bootcamp',
  '#gousentrecamp',
  '#gous',
  '@gousentrecamp',
  'gous_entrecamp',
  'gous entrepreneur',
  'go-us entrepreneur',
];

function detectPlatform(url) {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
  if (url.includes('threads.com') || url.includes('threads.net')) return 'threads';
  return 'unknown';
}

function getUserAgent(platform) {
  switch (platform) {
    case 'linkedin':
      return 'Twitterbot/1.0';
    case 'facebook':
      return 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    case 'threads':
      return 'Twitterbot/1.0';
    default:
      return 'Twitterbot/1.0';
  }
}

function extractOgTags(html) {
  const tags = {};
  const regex = /<meta\s+(?:property|name)=["']([^"']+)["']\s+content=["']([^"']*?)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    tags[match[1]] = decodeHtmlEntities(match[2]);
  }
  // Also match content before property
  const regex2 = /<meta\s+content=["']([^"']*?)["']\s+(?:property|name)=["']([^"']+)["']/gi;
  while ((match = regex2.exec(html)) !== null) {
    tags[match[2]] = decodeHtmlEntities(match[1]);
  }
  return tags;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractJsonLd(html) {
  const results = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      results.push(JSON.parse(match[1]));
    } catch {}
  }
  return results;
}

function extractEmbeddedJson(html, searchKey) {
  const regex = new RegExp(`"${searchKey}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'g');
  const results = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const decoded = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/')
        .replace(/\\u([0-9a-f]{4})/gi, (_, hex) =>
          String.fromCodePoint(parseInt(hex, 16))
        );
      results.push(decoded);
    } catch {}
  }
  return results;
}

function parseLinkedin(html) {
  const jsonLd = extractJsonLd(html);
  const og = extractOgTags(html);

  let authorName = '';
  let authorAvatar = '';
  let authorUrl = '';
  let caption = '';
  let postImage = '';
  let postUrl = og['og:url'] || '';

  // Extract from JSON-LD
  for (const data of jsonLd) {
    if (data.author) {
      authorName = data.author.name || authorName;
      if (data.author.image) {
        authorAvatar = data.author.image.url || data.author.image || authorAvatar;
      }
      authorUrl = data.author.url || authorUrl;
    }
    if (data.articleBody) {
      caption = data.articleBody;
    }
    if (data.image) {
      postImage = data.image.url || data.image || postImage;
    }
  }

  // Fallback: extract author name from embedded JSON
  if (!authorName) {
    const names = extractEmbeddedJson(html, 'name');
    // Find first name that looks like a person (has a space)
    for (const name of names) {
      if (name.includes(' ') && name.length < 60 && !name.includes('LinkedIn')) {
        authorName = name;
        break;
      }
    }
  }

  // Fallback caption from embedded "text" field
  if (!caption) {
    const texts = extractEmbeddedJson(html, 'text');
    if (texts.length > 0) {
      caption = texts.reduce((a, b) => (a.length > b.length ? a : b), '');
    }
  }

  // Extract author URL from post URL slug
  if (!authorUrl && postUrl) {
    const slugMatch = postUrl.match(/linkedin\.com\/posts\/([^_]+)/);
    if (slugMatch) {
      authorUrl = `https://www.linkedin.com/in/${slugMatch[1]}/`;
    }
  }

  // Fallback post image from OG
  if (!postImage) postImage = og['og:image'] || '';

  return { authorName, authorAvatar, authorUrl, caption, postImage, postUrl };
}

function parseFacebook(html) {
  const og = extractOgTags(html);

  let authorName = og['og:title'] || '';
  let authorAvatar = '';
  let authorUrl = '';
  let caption = '';
  let postImage = og['og:image'] || '';
  let postUrl = og['og:url'] || '';

  // Extract full caption from embedded JSON "text" field
  const texts = extractEmbeddedJson(html, 'text');
  if (texts.length > 0) {
    caption = texts.reduce((a, b) => (a.length > b.length ? a : b), '');
  }

  // Fallback to og:description
  if (!caption) {
    caption = og['og:description'] || '';
  }

  // Extract author name from embedded JSON
  const names = extractEmbeddedJson(html, 'name');
  for (const name of names) {
    if (name.includes(' ') && name.length < 60 && name === authorName) {
      break;
    }
    if (!authorName && name.includes(' ') && name.length < 60) {
      authorName = name;
      break;
    }
  }

  // Extract profile picture from embedded JSON
  // Facebook embeds: "profile_picture":{"uri":"https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=XXXXX"}
  const profilePicMatch = html.match(/"profile_picture"\s*:\s*\{\s*"uri"\s*:\s*"([^"]+)"/);
  if (profilePicMatch) {
    authorAvatar = profilePicMatch[1].replace(/\\\//g, '/');
  }

  // Extract author URL from og:url
  if (postUrl) {
    const match = postUrl.match(/facebook\.com\/([^/]+)\//);
    if (match && match[1] !== 'share') {
      authorUrl = `https://www.facebook.com/${match[1]}/`;
    }
  }

  return { authorName, authorAvatar, authorUrl, caption, postImage, postUrl };
}

function parseThreads(html) {
  const og = extractOgTags(html);

  let authorName = (og['og:title'] || '').replace(/ on Threads$/, '').replace(/\(@.*\)/, '').trim();
  // Threads og:image is the user's profile picture, not a post image
  const ogImage = og['og:image'] || '';
  let authorAvatar = ogImage;
  let authorUrl = '';
  let caption = og['og:description'] || '';
  let postImage = '';
  let postUrl = og['og:url'] || '';

  // Extract author URL from post URL
  const handleMatch = postUrl.match(/threads\.com\/(@[^/]+)/);
  if (handleMatch) {
    authorUrl = `https://www.threads.com/${handleMatch[1]}`;
  }

  return { authorName, authorAvatar, authorUrl, caption, postImage, postUrl };
}

function containsKeyword(text) {
  const lower = text.toLowerCase();
  return KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

async function fetchImageAsDataUri(url) {
  if (!url) return '';

  // Try multiple User-Agents — some CDNs only respond to specific ones
  const userAgents = [
    'facebookexternalhit/1.1',
    'Twitterbot/1.0',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ];

  for (const ua of userAgents) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': ua,
          Accept: 'image/*,*/*;q=0.8',
        },
        redirect: 'follow',
      });
      if (!resp.ok) continue;
      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) continue;
      const buffer = await resp.arrayBuffer();
      if (buffer.byteLength > 500000) return '';
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      return `data:${contentType};base64,${base64}`;
    } catch {
      continue;
    }
  }
  return '';
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers,
      });
    }

    const platform = detectPlatform(url);
    if (platform === 'unknown') {
      return new Response(
        JSON.stringify({
          error: 'Unsupported platform. Please submit a LinkedIn, Facebook, or Threads post.',
        }),
        { status: 400, headers }
      );
    }

    // Check for duplicates
    const existingKey = `post:${btoa(url).replace(/[/+=]/g, '').slice(0, 80)}`;
    const existing = await env.SOCIAL_POSTS.get(existingKey);
    if (existing) {
      return new Response(
        JSON.stringify({ error: 'This post has already been submitted.' }),
        { status: 409, headers }
      );
    }

    // Fetch the post page
    const response = await fetch(url, {
      headers: {
        'User-Agent': getUserAgent(platform),
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch post (HTTP ${response.status})` }),
        { status: 502, headers }
      );
    }

    const html = await response.text();

    // Parse based on platform
    let data;
    switch (platform) {
      case 'linkedin':
        data = parseLinkedin(html);
        break;
      case 'facebook':
        data = parseFacebook(html);
        break;
      case 'threads':
        data = parseThreads(html);
        break;
    }

    // Check for keywords in caption
    if (!containsKeyword(data.caption)) {
      return new Response(
        JSON.stringify({
          error:
            'Post must mention Go-US Entrepreneur Bootcamp or #gousentrecamp to be featured.',
        }),
        { status: 400, headers }
      );
    }

    // Download avatar and post image as base64 data URIs so they always display
    const authorAvatar = await fetchImageAsDataUri(data.authorAvatar);
    const postImage = await fetchImageAsDataUri(data.postImage);

    // Store the post
    const post = {
      id: existingKey,
      platform,
      authorName: data.authorName,
      authorAvatar,
      authorUrl: data.authorUrl,
      caption: data.caption,
      postUrl: data.postUrl,
      postImage,
      timestamp: Date.now(),
    };

    await env.SOCIAL_POSTS.put(existingKey, JSON.stringify(post));

    return new Response(
      JSON.stringify({ success: true, post }),
      { status: 201, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Something went wrong: ' + err.message }),
      { status: 500, headers }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
