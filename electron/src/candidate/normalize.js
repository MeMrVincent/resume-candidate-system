'use strict';

function normPhone(v) {
  let s = String(v == null ? '' : v).replace(/\D+/g, '');
  if (s.length === 13 && s.startsWith('86')) s = s.slice(2);
  return s;
}
function normLandline(v) { return String(v == null ? '' : v).replace(/\D+/g, ''); }
function normEmail(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

// 统一为 ISO：YYYY-MM-DD 或 YYYY-MM；"至今"/空/无法识别 -> ''（无法识别时 bad=true）
function isoDate(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s || /^(至今|现在|present|now)$/i.test(s)) return { value: '', bad: false };
  let m;
  const p2 = (x) => String(x).padStart(2, '0');
  if ((m = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/))) return { value: `${m[1]}-${p2(m[2])}-${p2(m[3])}`, bad: false };
  if ((m = s.match(/^(\d{4})年(\d{1,2})月?$/))) return { value: `${m[1]}-${p2(m[2])}`, bad: false };
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return { value: `${m[1]}-${p2(m[2])}-${p2(m[3])}`, bad: false };
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})$/))) return { value: `${m[1]}-${p2(m[2])}`, bad: false };
  if ((m = s.match(/^(\d{4})年?$/))) return { value: m[1], bad: false };
  // 学年区间 2014-2015(学年) / 多年列举 1996年、1997年 -> 取首个年份
  if ((m = s.match(/^(\d{4})\s*[-~—–]\s*\d{4}\s*(学年)?$/)) || (m = s.match(/^(\d{4})年[、,，]/))) return { value: m[1], bad: false };
  return { value: '', bad: true };
}

function toNum(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function toInt(v) { const n = toNum(v); return n === null ? null : Math.trunc(n); }
function toText(v) { return v === null || v === undefined ? '' : String(v).trim(); }

// 工作年限：按工作区间并集计算（月精度），返回年（保留 1 位）
function ymIndex(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(iso || '');
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null;
}
function computeWorkYears(works, now = new Date()) {
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const iv = [];
  for (const w of works) {
    const s = ymIndex(w.position_start);
    if (s === null) continue;
    let e = w.position_resigned ? ymIndex(w.position_resigned) : nowIdx;
    if (e === null || e < s) continue;
    iv.push([s, e]);
  }
  iv.sort((a, b) => a[0] - b[0]);
  let total = 0, cur = null;
  for (const [s, e] of iv) {
    if (!cur) cur = [s, e];
    else if (s <= cur[1]) cur[1] = Math.max(cur[1], e);
    else { total += cur[1] - cur[0]; cur = [s, e]; }
  }
  if (cur) total += cur[1] - cur[0];
  return iv.length ? Math.round(total / 12 * 10) / 10 : null;
}

module.exports = { ymIndex, normPhone, normLandline, normEmail, isoDate, toNum, toInt, toText, computeWorkYears };
