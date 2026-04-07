export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { keyword = '', pageNo = 1, numOfRows = 20 } = req.query;
  const serviceKey = process.env.PUBLIC_DATA_KEY;
  try {
    const url = `https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/getNationalWelfarelistV001?serviceKey=${serviceKey}&callTp=L&srchKeyword=${encodeURIComponent(keyword)}&pageNo=${pageNo}&numOfRows=${numOfRows}`;
    const response = await fetch(url);
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.json({ data: text });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
