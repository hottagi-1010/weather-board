// api/kma.js – Vercel 서버 함수 (읽기만)
// /api/kma?region=대전 → 그 지역 wx_tasks 일정 · 기상청 단기예보 날씨 · 판단을 JSON 으로
// 기상청 키는 Vercel 환경변수 SHORT_WEATHER_KEY 에만 둠. DB 는 config.js 의 공개용 키로 읽음
const fs = require('fs');
const path = require('path');
const { REGIONS, judge, weatherText, rulesText, kmaGrid, kmaBase, buildKmaUrl, parseKma } = require('../logic.js');

// config.js 두 줄에서 주소 · 공개용 키를 꺼냄 (연결 정보를 한 곳에만 두려고)
function readConfig() {
  const text = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
  const pick = (name) => (text.match(new RegExp(name + "\\s*=\\s*'([^']*)'")) || [])[1] || '';
  return { url: pick('SUPABASE_URL'), key: pick('SUPABASE_KEY') };
}

async function loadTasks(region) {
  const { url, key } = readConfig();
  if (!url || !key) throw new Error('config.js 에 Supabase 주소 · 공개용 키가 없어요');
  const res = await fetch(url + '/rest/v1/wx_tasks?select=title,region,kind,owner&order=id&region=eq.' + encodeURIComponent(region),
    { headers: { apikey: key }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// 실패해도 일정은 돌려주도록 { weather, error } 로 받음
async function loadWeather(r, base) {
  const key = process.env.SHORT_WEATHER_KEY;
  if (!key) return { weather: null, error: 'Vercel 환경변수 SHORT_WEATHER_KEY 가 없어요' };
  try {
    const res = await fetch(buildKmaUrl(key, kmaGrid(r.lat, r.lon), base), { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch {
      // 키 오류 등은 XML 로 옴 → 안의 오류 이름만
      const m = text.match(/<returnAuthMsg>([^<]*)<\/returnAuthMsg>|<resultMsg>([^<]*)<\/resultMsg>/);
      return { weather: null, error: '기상청 응답 오류 (' + (m ? (m[1] || m[2]) : 'HTTP ' + res.status) + ')' };
    }
    const header = json.response && json.response.header;
    if (header && header.resultCode !== '00') return { weather: null, error: '기상청 응답 오류 (' + header.resultMsg + ')' };
    const weather = parseKma(json, base.today);
    return weather ? { weather, error: '' } : { weather: null, error: '기상청 응답에 오늘 값이 없어요' };
  } catch (err) {
    return { weather: null, error: '기상청에 연결하지 못했어요 (' + err.message + ')' };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const region = String((req.query && req.query.region) || '').trim();
  const r = REGIONS.find((x) => x.name === region);
  if (!r) {
    return res.status(400).json({ error: 'region 은 ' + REGIONS.map((x) => x.name).join(' · ') + ' 중 하나로 주세요. 예: /api/kma?region=대전' });
  }

  const base = kmaBase(new Date());
  let tasks;
  try {
    tasks = await loadTasks(region);
  } catch (err) {
    return res.status(502).json({ error: '일정 DB를 읽지 못했어요 (' + err.message + ')' });
  }
  const { weather, error } = await loadWeather(r, base);

  const d = base.today;
  const result = {
    region,
    date: d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6),
    source: '기상청 단기예보 (' + base.baseDate.slice(0, 4) + '-' + base.baseDate.slice(4, 6) + '-' + base.baseDate.slice(6)
      + ' ' + base.baseTime.slice(0, 2) + ':00 발표)',
    weather,
    weatherText: weatherText(weather),
    tasks: tasks.map((t) => {
      const j = judge(t.kind, weather);
      return { title: t.title, kind: t.kind, owner: t.owner, judge: j.text, level: j.level };
    }),
    rules: rulesText(),
  };
  if (error) result.weatherError = error;
  res.status(200).json(result);
};
