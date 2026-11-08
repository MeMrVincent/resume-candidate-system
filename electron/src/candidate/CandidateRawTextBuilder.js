'use strict';
// 规则 B：raw_text 由字段显式拼装（固定顺序），多语言简历逐份拼入，换行 \n；
// 不全局去重，不含 id / uuid / 时间戳。
const { LIST_SPECS, BASE_COLS } = require('./listSpecs');

const push = (lines, v) => {
  if (v === null || v === undefined) return;
  const s = String(v).trim();
  if (s !== '') lines.push(s);
};

function buildRawText(model) {
  const lines = [];
  push(lines, model.fullName);
  push(lines, model.englishName);
  for (const c of model.contacts || []) push(lines, c.value);

  for (const r of model.resumes || []) {
    for (const col of Object.keys(BASE_COLS)) push(lines, r.base ? r.base[col] : '');
    for (const spec of LIST_SPECS) {
      for (const row of r[spec.key] || []) {
        for (const col of Object.keys(spec.cols)) push(lines, row[col]);
      }
    }
    for (const c of r.communication_list || []) {
      push(lines, c.communicate_time);
      push(lines, c.communicate_content);
    }
  }
  return lines.join('\n');
}
module.exports = { buildRawText };
