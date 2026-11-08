'use strict';
// 把 resume-merge-v3.0 JSON 解析成候选人 model（纯函数，无 DB）。
const { LIST_SPECS, BASE_COLS } = require('../candidate/listSpecs');
const N = require('../candidate/normalize');

function convert(type, v, ctx) {
  if (type === 'n') return N.toNum(v);
  if (type === 'i') return N.toInt(v);
  if (type === 'd') {
    const r = N.isoDate(v);
    if (r.bad) ctx.warnings.push({ code: 'bad_date', message: `无法识别的日期: ${v}`, detail: ctx.where });
    return r.value;
  }
  return N.toText(v);
}

function parseRow(src, cols, ctx) {
  const row = {};
  for (const [c, t] of Object.entries(cols)) row[c] = convert(t, src ? src[c] : undefined, ctx);
  return row;
}

function buildContacts(mi) {
  const out = [];
  const seen = new Set();
  const add = (type, value, isPrimary, isShared) => {
    const raw = N.toText(value);
    if (!raw) return;
    const normalized = type === 'email' ? N.normEmail(raw) : type === 'mobile' ? N.normPhone(raw) : N.normLandline(raw);
    if (!normalized) return;
    const key = `${type}|${normalized}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ type, value: raw, normalized, isPrimary: isPrimary ? 1 : 0, isShared: isShared ? 1 : 0 });
  };
  add('mobile', mi.primary_phone, true, false);
  for (const v of mi.other_phones || []) add('mobile', v, false, false);
  for (const v of mi.landlines || []) add('landline', v, false, false);
  add('email', mi.primary_email, true, false);
  for (const v of mi.other_emails || []) add('email', v, false, false);
  for (const s of mi.shared_contacts_ignored || []) {
    const v = typeof s === 'object' && s ? (s.value || s.contact || s.phone || s.email || '') : s;
    const str = N.toText(v);
    if (!str) continue;
    add(str.includes('@') ? 'email' : 'mobile', str, false, true);
  }
  return out;
}

function parseV3(json, fileName = '') {
  const warnings = [];
  const mi = json.merge_info || {};
  const resumesSrc = (json.structured_data && json.structured_data.resumes) || [];
  if (!resumesSrc.length) throw new Error('structured_data.resumes 为空');

  const resumes = resumesSrc.map((rs, idx) => {
    const ctx = { warnings, where: { resume: idx, lang: rs.resume_languge } };
    const r = {
      languageCode: N.toText(rs.resume_languge) || 'zh',
      isPrimary: idx === 0 ? 1 : 0,
      base: parseRow(rs.base_info || {}, BASE_COLS, ctx),
      communication_list: [],
    };
    for (const spec of LIST_SPECS) {
      r[spec.key] = (rs[spec.key] || []).map((it) => {
        const row = parseRow(it, spec.cols, ctx);
        if (spec.key === 'training_list') row.raw_json = JSON.stringify(it);
        return row;
      });
    }
    r.communication_list = (rs.communication_list || []).map((c) => ({
      communicate_time: N.toText(c.communicate_time),
      communicate_content: N.toText(c.communicate_content),
    })).filter((c) => c.communicate_content || c.communicate_time);
    return r;
  });

  // 多语言对齐校验：条数 + 关键日期（容差 24 个月）
  const primary = resumes[0];
  const keyDate = { work_experiences: 'position_start', education_list: 'school_start_ym' };
  for (let i = 1; i < resumes.length; i++) {
    for (const spec of LIST_SPECS) {
      const a = primary[spec.key], b = resumes[i][spec.key];
      if (a.length !== b.length) {
        warnings.push({ code: 'list_misaligned', message: `${spec.key} 条数不一致: zh=${a.length} ${resumes[i].languageCode}=${b.length}`,
          detail: { list: spec.key, lang: resumes[i].languageCode } });
        continue;
      }
      const kd = keyDate[spec.key];
      // 仅当两边日期都有值才比较（一边缺日期不算错位，多为中文版漏解析）
      // 各语言简历来自不同平台，同一条经历日期可差几个月；相差超过 24 个月才视为错位
      const far = (x, y) => { const p = N.ymIndex(x), q = N.ymIndex(y); return p !== null && q !== null && Math.abs(p - q) > 24; };
      if (kd && a.some((row, k) => far(row[kd], b[k][kd]))) {
        warnings.push({ code: 'list_misaligned', message: `${spec.key} 的 ${kd} 顺序与主简历不一致`,
          detail: { list: spec.key, lang: resumes[i].languageCode } });
      }
    }
  }

  const works = primary.work_experiences;
  const cur = works.find((w) => !w.position_resigned) ||
    [...works].sort((x, y) => (y.position_start || '').localeCompare(x.position_start || ''))[0] || {};
  const topEdu = [...primary.education_list].sort((x, y) => (y.school_degree_rank || 0) - (x.school_degree_rank || 0))[0] || {};

  const baseInfo = primary.base;
  return {
    recordId: N.toText(json.record_id),
    fileName,
    fullName: N.toText(mi.canonical_name) || baseInfo.full_name,
    englishName: N.toText(mi.english_name),
    gender: baseInfo.gender,
    birthDate: baseInfo.birth_date,
    city: baseInfo.city,
    currentCompany: cur.company_name || '',
    currentPosition: cur.position || '',
    highestDegree: topEdu.school_degree_type || '',
    workYears: N.computeWorkYears(works),
    contacts: buildContacts(mi),
    resumes,
    warnings,
  };
}
module.exports = { parseV3 };
