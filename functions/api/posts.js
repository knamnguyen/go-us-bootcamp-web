export async function onRequestGet(context) {
  const { env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const list = await env.SOCIAL_POSTS.list();
    const posts = [];

    for (const key of list.keys) {
      const value = await env.SOCIAL_POSTS.get(key.name, { type: 'json' });
      if (value) posts.push(value);
    }

    // Sort by timestamp descending
    posts.sort((a, b) => b.timestamp - a.timestamp);

    return new Response(JSON.stringify({ posts }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers,
    });
  }
}
