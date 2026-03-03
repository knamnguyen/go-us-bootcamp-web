export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SHARE_URL = 'https://gous-entrecamp.pages.dev';
  let lang = 'en';

  try {
    const body = await request.json();
    lang = body.lang || 'en';

    const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      throw new Error('API key not configured');
    }

    const promptEn = `Write a casual message like you're texting a friend about GO-US Entrepreneur Bootcamp.

CONTEXT: Free 2-day workshop in HCMC (April 11-12, 2025) for Vietnamese entrepreneurs to learn about the US market. Funded by U.S. Dept of State/YSEALI.

STYLE GUIDE:
- Sound like a real Gen Z/young professional sharing something cool they found
- Casual, lowercase okay, natural typing style
- NO salesy language, NO "amazing opportunity", NO "don't miss out"
- 1-2 sentences max, keep it short like a real text
- Use 0-2 emojis max, not excessive

CRITICAL: Do NOT include any URL, link, or website in your response. The link will be added separately.

EXAMPLES of the vibe:
- "hey guyss just found this free bootcamp for viet entrepreneurs wanting to crack the US market, looks pretty legit"
- "yo if anyone's building something and wants to learn about selling to the US, check this out"
- "found this workshop thing for founders, it's free and in hcmc next month"

OUTPUT: Return ONLY the message text. No quotes, no explanations, NO LINKS/URLs.`;

    const promptVi = `Viết tin nhắn casual như đang nhắn cho bạn bè về GO-US Entrepreneur Bootcamp.

BỐI CẢNH: Workshop miễn phí 2 ngày ở TPHCM (11-12/4/2025) cho founders Việt Nam học về thị trường Mỹ. Tài trợ bởi Bộ Ngoại giao Mỹ/YSEALI.

CÁCH VIẾT:
- Viết như Gen Z Việt Nam nhắn tin cho bạn bè, tự nhiên
- Dùng tiếng lóng phổ biến: "hay phết", "đỉnh", "xịn", "t" thay "tao/mình", "m" thay "mày/bạn"
- Viết tắt tự nhiên: "ko" (không), "đc" (được), "j" (gì), "r" (rồi)
- KHÔNG dùng ngôn ngữ quảng cáo, KHÔNG "cơ hội vàng", KHÔNG "đừng bỏ lỡ"
- 1-2 câu thôi, ngắn gọn như tin nhắn thật
- Dùng 0-2 emoji, đừng spam

QUAN TRỌNG: KHÔNG bao gồm bất kỳ URL, link, hay website nào. Link sẽ được thêm riêng.

VÍ DỤ:
- "ê t mới tìm đc cái workshop này cho founders việt muốn hiểu thị trường mỹ, free luôn"
- "m có đang build gì ko? có cái bootcamp này hay phết cho mấy đứa muốn sell qua mỹ"
- "vừa thấy cái này khá xịn cho startup, ở tphcm tháng 4, free nữa"

OUTPUT: Chỉ trả về tin nhắn. Không giải thích, KHÔNG CÓ LINK/URL.`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: 'arcee-ai/trinity-mini:free',
          messages: [{ role: 'user', content: lang === 'en' ? promptEn : promptVi }],
          temperature: 0.9,
          max_tokens: 200
        })
      }
    );

    const data = await response.json();
    console.log('OpenRouter response:', JSON.stringify(data));

    let caption = data.choices?.[0]?.message?.content || '';

    // If no caption from API, throw error to use fallback
    if (!caption) {
      console.log('No caption from OpenRouter, using fallback');
      const err = new Error('Empty response from OpenRouter');
      err.apiResponse = JSON.stringify(data);
      throw err;
    }

    // Clean up the caption
    caption = caption.trim();
    // Remove surrounding quotes
    caption = caption.replace(/^["']|["']$/g, '');
    // Remove any URLs (http, https, or just domain patterns)
    caption = caption.replace(/https?:\/\/[^\s]+/gi, '');
    caption = caption.replace(/gous-entrecamp\.pages\.dev/gi, '');
    caption = caption.replace(/\b\w+\.pages\.dev\b/gi, '');
    caption = caption.replace(/\b\w+\.(com|dev|io|org|net)\b/gi, '');
    // Clean up any leftover artifacts
    caption = caption.replace(/:\s*$/, ''); // Remove trailing colon
    caption = caption.replace(/\s+/g, ' '); // Normalize whitespace
    caption = caption.trim();

    // Always append link at end with 2 line breaks
    caption = caption + '\n\n' + SHARE_URL;

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);

    const fallbackEn = `hey found this free workshop for viet founders wanting to learn about the US market, looks pretty solid 👀\n\n${SHARE_URL}`;
    const fallbackVi = `ê t mới thấy cái workshop này hay phết cho founders muốn hiểu thị trường mỹ, free luôn\n\n${SHARE_URL}`;

    return new Response(JSON.stringify({
      caption: lang === 'vi' ? fallbackVi : fallbackEn,
      error: true,
      errorMessage: error.message,
      hasApiKey: !!env.OPENROUTER_API_KEY,
      apiResponse: error.apiResponse || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
