const CANDIDATES = {
  medical: [
    '아토피 치료','건선 치료','두드러기 원인','비염 치료','축농증 치료',
    '역류성식도염 치료','과민성대장증후군','위염 치료','허리디스크 치료',
    '무릎연골 치료','오십견 치료','족저근막염','갑상선 치료','당뇨 초기증상',
    '고혈압 관리','공황장애 증상','불면증 원인','임플란트 비용','치아교정 비용',
    '라식 비용','드림렌즈','탈모치료 비용','여드름 치료','보톡스 비용',
    '도수치료 비용','건강검진 비용','MRI 비용','대장내시경','독감예방접종',
    '갱년기 증상','자궁근종','체외충격파','추나요법','스케일링 비용',
  ],
  gov: [
    '근로장려금 신청','자녀장려금 대상','기초연금 조건','실업급여 조건',
    '육아휴직급여 신청','출산지원금 2026','아동수당 신청','청년지원금 2026',
    '청년도약계좌','청년 월세 지원','주거급여 조건','청년 전세자금 대출',
    '차상위계층 혜택','기초생활수급 조건','건강보험환급 신청','본인부담상한제',
    '소상공인지원금','소상공인 대출','에너지바우처 신청','노란우산공제',
    '경기도 지원금','서울시 지원금','지역화폐 신청','장애인연금 신청',
  ],
  tax: [
    '연말정산 공제','월세 세액공제','의료비 공제','교육비 공제','기부금 공제',
    '종합소득세 신고','프리랜서 종소세','부가가치세 신고','사업자 경비처리',
    '부동산 취득세','재산세 계산','양도소득세 계산','1가구 1주택 비과세',
    '증여세 계산','상속세 신고','절세 방법','신용카드 공제','차량유지비 공제',
  ],
  biz: [
    '재테크 방법','ETF 투자','ISA계좌 혜택','배당주 추천','적금 금리비교',
    'CMA 통장','파킹통장','퇴직금 계산','4대보험 계산','프리랜서 세금',
    '소상공인 대출 조건','부동산투자','주식투자 초보','금 투자','연금저축 펀드',
  ],
};

async function getBlogCount(query, clientId, clientSecret) {
  const res = await fetch(
    `https://openapi.naver.com/v1/search/blog?query=${encodeURIComponent(query)}&display=1`,
    { headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret } }
  );
  const data = await res.json();
  return data.total || 0;
}

async function getTrend(keyword, clientId, clientSecret) {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
    method: 'POST',
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDate: start, endDate: end, timeUnit: 'date',
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }]
    })
  });
  const data = await res.json();
  const results = data.results?.[0]?.data || [];
  if (!results.length) return 0;
  const avg = results.reduce((s, d) => s + d.ratio, 0) / results.length;
  return Math.round(avg * 10) / 10;
}

function getGrade(trend, blogCount) {
  // 트렌드 높고 포스팅 적으면 황금
  if (trend >= 20 && blogCount < 50000) return 'gold';
  if (trend >= 10 && blogCount < 100000) return 'ok';
  if (trend >= 5 && blogCount < 200000) return 'ok';
  return 'low';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { cats = ['medical'], gradeFilter = 'gold' } = req.body;
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  // 선택된 카테고리 키워드 합치기
  const candidates = cats.flatMap(c => CANDIDATES[c] || []);
  // 랜덤 셔플 후 최대 30개만 (API 호출 제한)
  const shuffled = candidates.sort(() => Math.random() - 0.5).slice(0, 30);

  try {
    const results = await Promise.all(shuffled.map(async (keyword) => {
      const [trend, blogCount] = await Promise.all([
        getTrend(keyword, clientId, clientSecret),
        getBlogCount(keyword, clientId, clientSecret)
      ]);
      const grade = getGrade(trend, blogCount);
      return { keyword, trend, blogCount, grade };
    }));

    // 필터링 + 정렬
    const filtered = results
      .filter(k => gradeFilter === 'gold' ? k.grade === 'gold' : k.grade !== 'low')
      .sort((a, b) => {
        if (a.grade === 'gold' && b.grade !== 'gold') return -1;
        if (a.grade !== 'gold' && b.grade === 'gold') return 1;
        return b.trend - a.trend;
      });

    res.json({ keywords: filtered, total: results.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
