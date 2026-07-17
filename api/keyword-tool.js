// 파일 위치: /api/keyword-tool.js
// 호출 예시: https://내도메인.vercel.app/api/keyword-tool?keyword=재택부업
//
// 필요한 환경변수 (Vercel 대시보드 > Settings > Environment Variables 에서만 설정):
//   NAVER_AD_CUSTOMER_ID     = CUSTOMER_ID
//   NAVER_AD_ACCESS_LICENSE  = 액세스라이선스
//   NAVER_AD_SECRET_KEY      = 비밀키 (절대 코드/채팅에 노출 금지)

import crypto from 'crypto';

function generateSignature(timestamp, method, uri, secretKey) {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 요청만 허용됩니다.' });
  }

  const { keyword } = req.query;
  if (!keyword) {
    return res.status(400).json({ error: 'keyword 파라미터가 필요해요. 예: /api/keyword-tool?keyword=재택부업' });
  }

  const customerId = process.env.NAVER_AD_CUSTOMER_ID;
  const apiKey = process.env.NAVER_AD_ACCESS_LICENSE;
  const secretKey = process.env.NAVER_AD_SECRET_KEY;

  if (!customerId || !apiKey || !secretKey) {
    return res.status(500).json({ error: '서버에 NAVER_AD_CUSTOMER_ID / NAVER_AD_ACCESS_LICENSE / NAVER_AD_SECRET_KEY 환경변수가 설정되지 않았어요.' });
  }

  const timestamp = Date.now().toString();
  const method = 'GET';
  const uri = '/keywordstool';
  const signature = generateSignature(timestamp, method, uri, secretKey);

  try {
    const url = `https://api.naver.com${uri}?hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`;

    const adRes = await fetch(url, {
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY': apiKey,
        'X-Customer': customerId,
        'X-Signature': signature,
      },
    });

    if (!adRes.ok) {
      const errText = await adRes.text();
      return res.status(adRes.status).json({ error: '네이버 검색광고 API 호출 실패', detail: errText });
    }

    const data = await adRes.json();

    const items = (data.keywordList || []).map(k => ({
      keyword: k.relKeyword,
      pcSearch: k.monthlyPcQcCnt,
      mobileSearch: k.monthlyMobileQcCnt,
      competition: k.compIdx, // '낮음' | '중간' | '높음'
    })).slice(0, 20);

    return res.status(200).json({ keyword, items });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
}
