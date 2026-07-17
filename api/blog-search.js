// 파일 위치: /api/blog-search.js
// Vercel에 배포하면 자동으로 https://내도메인.vercel.app/api/blog-search 로 호출 가능해져요.
//
// 필요한 환경변수 (Vercel 대시보드 > Settings > Environment Variables 에서만 설정, 코드에 절대 적지 않기):
//   NAVER_CLIENT_ID
//   NAVER_CLIENT_SECRET

export default async function handler(req, res) {
  // CORS 허용: 프로토타입/서비스 화면(다른 출처)에서 이 API를 호출할 수 있도록 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 우리 프론트엔드(브라우저)에서만 호출 가능하도록 GET만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 요청만 허용됩니다.' });
  }

  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'query 파라미터가 필요해요. 예: /api/blog-search?query=재택부업' });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: '서버에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았어요.' });
  }

  try {
    const naverUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=10&sort=sim`;

    const naverRes = await fetch(naverUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!naverRes.ok) {
      const errText = await naverRes.text();
      return res.status(naverRes.status).json({ error: '네이버 API 호출 실패', detail: errText });
    }

    const data = await naverRes.json();

    // 프론트에 필요한 것만 정리해서 반환
    const items = (data.items || []).map(item => ({
      title: item.title.replace(/<[^>]*>/g, ''),      // <b> 태그 제거
      description: item.description.replace(/<[^>]*>/g, ''),
      link: item.link,
      bloggername: item.bloggername,
      postdate: item.postdate,
    }));

    return res.status(200).json({ query, total: data.total, items });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
}
