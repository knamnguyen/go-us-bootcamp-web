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

    const GEMINI_API_KEY = env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      throw new Error('API key not configured');
    }

    const promptEn = `Write a casual message like you're texting a friend about GO-US Entrepreneur Bootcamp.

CONTEXT: Free 2-day workshop in HCMC (April 11-12, 2025) for Vietnamese entrepreneurs to learn about the US market. Funded by U.S. Dept of State/YSEALI.

STYLE GUIDE:
- Sound like a real Gen Z/young professional sharing something cool they found
- Casual, lowercase okay, natural typing style
- NO salesy language, NO "amazing opportunity", NO "don't miss out"
- NO AI artifacts like "[Apply Link Here]" or "[link]"
- 1-2 sentences max, keep it short like a real text
- Use 0-2 emojis max, not excessive
- Do NOT include any link in your message

EXAMPLES of the vibe:
- "hey guyss just found this free bootcamp for viet entrepreneurs wanting to crack the US market, looks pretty legit"
- "yo if anyone's building something and wants to learn about selling to the US, check this out"
- "found this workshop thing for founders, it's free and in hcmc next month"

OUTPUT: Return ONLY the message text, nothing else. No quotes, no explanations, no link.`;

    const promptVi = `Viết tin nhắn casual như đang nhắn cho bạn bè về GO-US Entrepreneur Bootcamp.

BỐI CẢNH: Workshop miễn phí 2 ngày ở TPHCM (11-12/4/2025) cho founders Việt Nam học về thị trường Mỹ. Tài trợ bởi Bộ Ngoại giao Mỹ/YSEALI.

CÁCH VIẾT:
- Viết như Gen Z Việt Nam nhắn tin cho bạn bè, tự nhiên
- Dùng tiếng lóng phổ biến: "hay phết", "đỉnh", "xịn", "t" thay "tao/mình", "m" thay "mày/bạn"
- Viết tắt tự nhiên: "ko" (không), "đc" (được), "j" (gì), "r" (rồi)
- KHÔNG dùng ngôn ngữ quảng cáo, KHÔNG "cơ hội vàng", KHÔNG "đừng bỏ lỡ"
- KHÔNG có link trong tin nhắn
- 1-2 câu thôi, ngắn gọn như tin nhắn thật
- Dùng 0-2 emoji, đừng spam

VÍ DỤ:
- "ê t mới tìm đc cái workshop này cho founders việt muốn hiểu thị trường mỹ, free luôn"
- "m có đang build gì ko? có cái bootcamp này hay phết cho mấy đứa muốn sell qua mỹ"
- "vừa thấy cái này khá xịn cho startup, ở tphcm tháng 4, free nữa"

OUTPUT: Chỉ trả về tin nhắn, không giải thích gì thêm. Không có dấu ngoặc kép, không có link.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: lang === 'en' ? promptEn : promptVi }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 200 }
        })
      }
    );

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data));

    let caption = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // If no caption from API, throw error to use fallback
    if (!caption) {
      console.log('No caption from Gemini, using fallback');
      throw new Error('Empty response from Gemini');
    }

    // Clean up - remove quotes and any existing links
    caption = caption.trim().replace(/^["']|["']$/g, '');
    caption = caption.replace(/https?:\/\/[^\s]+/g, '').trim();
    caption = caption.replace(/:\s*$/, '').trim(); // Remove trailing colon

    // Always append link at end with proper formatting
    caption += `\n\n${SHARE_URL}`;

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);

    const fallbackEn = `hey found this free workshop for viet founders wanting to learn about the US market, looks pretty solid 👀\n\n${SHARE_URL}`;
    const fallbackVi = `ê t mới thấy cái workshop này hay phết cho founders muốn hiểu thị trường mỹ, free luôn\n\n${SHARE_URL}`;

    return new Response(JSON.stringify({
      caption: lang === 'vi' ? fallbackVi : fallbackEn,
      error: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
