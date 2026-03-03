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

  try {
    const { lang } = await request.json();

    const GEMINI_API_KEY = env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      throw new Error('API key not configured');
    }

    const promptEn = `Generate a short, catchy social media caption (2-3 sentences max) encouraging friends to apply for the GO-US Entrepreneur Bootcamp - a FREE 2-day workshop in Ho Chi Minh City (April 11-12, 2025) helping Vietnamese youth take local products to the US market. Funded by U.S. Department of State via YSEALI. Make it sound personal, excited, and authentic like a real person sharing with friends. Include relevant emojis. End with the apply link. Keep it under 280 characters if possible.`;

    const promptVi = `Tạo một caption mạng xã hội ngắn gọn, hấp dẫn (tối đa 2-3 câu) khuyến khích bạn bè đăng ký GO-US Entrepreneur Bootcamp - workshop MIỄN PHÍ 2 ngày tại TP.HCM (11-12/4/2025) giúp các bạn trẻ Việt Nam đưa sản phẩm sang thị trường Mỹ. Tài trợ bởi Bộ Ngoại giao Hoa Kỳ qua YSEALI. Viết tự nhiên, hào hứng như đang chia sẻ với bạn bè. Dùng emoji phù hợp. Kết thúc bằng link đăng ký. Giữ dưới 280 ký tự nếu có thể.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
    let caption = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean up
    caption = caption.trim().replace(/^["']|["']$/g, '');

    const SHARE_URL = 'https://gous-entrecamp.pages.dev';
    if (!caption.includes(SHARE_URL) && !caption.includes('gous-entrecamp')) {
      caption += `\n\n🔗 ${SHARE_URL}`;
    }

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);

    const SHARE_URL = 'https://gous-entrecamp.pages.dev';
    const fallbackEn = `🚀 Hey friends! Check out this FREE entrepreneur bootcamp in HCMC (April 11-12)! Learn to take Vietnamese products to the US market. Funded by U.S. Dept of State. Apply now! 🇻🇳→🇺🇸\n\n🔗 ${SHARE_URL}`;
    const fallbackVi = `🚀 Các bạn ơi! Workshop khởi nghiệp MIỄN PHÍ tại TPHCM (11-12/4)! Học cách đưa sản phẩm Việt sang Mỹ. Tài trợ bởi Bộ Ngoại giao Hoa Kỳ. Đăng ký ngay! 🇻🇳→🇺🇸\n\n🔗 ${SHARE_URL}`;

    return new Response(JSON.stringify({
      caption: fallbackEn,
      error: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
