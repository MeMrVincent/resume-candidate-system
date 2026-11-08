'use strict';

/**
 * @description 手机号标准化：只留数字，去掉 86 / +86 国家码
 * Normalizes a mobile number: keep digits only and strip the 86 / +86 country code
 * 携帯番号の正規化：数字のみ残し、86 / +86 の国番号を除く
 */
function normalizeMobilePhone(rawValue) {
  let digits = String(rawValue == null ? "" : rawValue).replace(/\D+/g, "");
  if (digits.length === 13 && digits.startsWith("86")) digits = digits.slice(2);
  return digits;
}

/**
 * @description 座机标准化：只留数字（保留区号）
 * Normalizes a landline number: keep digits only (area code is kept)
 * 固定電話の正規化：数字のみ残す（市外局番は保持）
 */
function normalizeLandlinePhone(rawValue) {
  return String(rawValue == null ? "" : rawValue).replace(/\D+/g, "");
}

/**
 * @description 邮箱标准化：去首尾空格并转小写
 * Normalizes an email address: trim spaces and lowercase
 * メールアドレスの正規化：前後の空白を除き小文字にする
 */
function normalizeEmailAddress(rawValue) {
  return String(rawValue == null ? "" : rawValue).trim().toLowerCase();
}

/**
 * @description 把简历里各种写法的日期统一成 ISO 文本。
 * 支持：2011年06月01日、2011年06月、2011/06、2011-06-01、2011.06、2011、2014-2015(学年)、1996年、1997年；
 * “至今/现在”返回空串（表示仍在职/在读）。
 * @description Converts the many date notations found in resumes into ISO text.
 * Supported: 2011年06月01日, 2011年06月, 2011/06, 2011-06-01, 2011.06, 2011, 2014-2015 (school year), 1996年、1997年;
 * "to date / present" returns an empty string (still employed / still studying).
 * @description 履歴書にあるさまざまな日付表記を ISO 文字列に統一する。
 * 対応：2011年06月01日、2011年06月、2011/06、2011-06-01、2011.06、2011、2014-2015（学年）、1996年、1997年；
 * 「至今／現在」は空文字を返す（在職中・在学中を表す）。
 * @returns {{isoDate: string, isUnrecognized: boolean}} 无法识别时 isoDate 为空串、isUnrecognized 为 true | When unrecognized, isoDate is an empty string and isUnrecognized is true | 認識できない場合 isoDate は空文字、isUnrecognized は true
 */
function convertToIsoDate(rawValue) {
  const text = String(rawValue == null ? "" : rawValue).trim();
  if (!text || /^(至今|现在|present|now)$/i.test(text)) return { isoDate: "", isUnrecognized: false };

  const padTwoDigits = number => String(number).padStart(2, "0");
  let matched;
  if ((matched = text.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/)))
    return { isoDate: `${matched[1]}-${padTwoDigits(matched[2])}-${padTwoDigits(matched[3])}`, isUnrecognized: false };
  if ((matched = text.match(/^(\d{4})年(\d{1,2})月?$/)))
    return { isoDate: `${matched[1]}-${padTwoDigits(matched[2])}`, isUnrecognized: false };
  if ((matched = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)))
    return { isoDate: `${matched[1]}-${padTwoDigits(matched[2])}-${padTwoDigits(matched[3])}`, isUnrecognized: false };
  if ((matched = text.match(/^(\d{4})[-/.](\d{1,2})$/)))
    return { isoDate: `${matched[1]}-${padTwoDigits(matched[2])}`, isUnrecognized: false };
  if ((matched = text.match(/^(\d{4})年?$/))) return { isoDate: matched[1], isUnrecognized: false };
  // 学年区间“2014-2015学年”、多年列举“1996年、1997年”：取第一个年份
  // School-year range "2014-2015学年" or a list of years "1996年、1997年": take the first year
  // 学年範囲「2014-2015学年」や複数年の列挙「1996年、1997年」：最初の年を採用する
  if ((matched = text.match(/^(\d{4})\s*[-~—–]\s*\d{4}\s*(学年)?$/)) || (matched = text.match(/^(\d{4})年[、,，]/)))
    return { isoDate: matched[1], isUnrecognized: false };
  return { isoDate: "", isUnrecognized: true };
}

/**
 * @description 转数字，空串/非数字返回 null
 * Converts to a number; empty or non-numeric input returns null
 * 数値に変換する。空文字・数値でない場合は null を返す
 */
function parseNumberOrNull(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  const text = String(rawValue).trim();
  if (text === "") return null;
  const parsedNumber = Number(text);
  return Number.isFinite(parsedNumber) ? parsedNumber : null;
}

/**
 * @description 转整数，空串/非数字返回 null
 * Converts to an integer; empty or non-numeric input returns null
 * 整数に変換する。空文字・数値でない場合は null を返す
 */
function parseIntegerOrNull(rawValue) {
  const parsedNumber = parseNumberOrNull(rawValue);
  return parsedNumber === null ? null : Math.trunc(parsedNumber);
}

/**
 * @description 转文本并去首尾空格，null/undefined 返回空串
 * Converts to trimmed text; null/undefined returns an empty string
 * 前後の空白を除いたテキストに変換する。null/undefined は空文字を返す
 */
function toTrimmedText(rawValue) {
  return rawValue === null || rawValue === undefined ? "" : String(rawValue).trim();
}

/**
 * @description ISO 日期（YYYY-MM...）转“自公元 0 年起的月序号”，便于算月份差；无法解析返回 null
 * Converts an ISO date (YYYY-MM...) to a month index counted from year 0, to make month differences easy; returns null if it cannot be parsed
 * ISO 日付（YYYY-MM...）を「西暦 0 年からの月通番」に変換し、月差の計算を容易にする。解析できない場合は null を返す
 */
function toMonthIndex(isoDate) {
  const matched = /^(\d{4})-(\d{2})/.exec(isoDate || "");
  return matched ? Number(matched[1]) * 12 + Number(matched[2]) - 1 : null;
}

/**
 * @description 计算工作年限：把所有工作区间取并集（重叠时间不重复计算），按月累计，换算成年并保留 1 位小数。
 * 离职日期为空视为仍在职，算到当前月份。
 * @description Calculates years of work experience: takes the union of all work periods (overlaps are not counted twice), sums by month, converts to years with 1 decimal.
 * An empty resignation date means still employed, counted up to the current month.
 * @description 勤続年数を計算する：すべての勤務期間の和集合を取り（重複期間は二重計上しない）、月単位で累計して年に換算し、小数 1 桁に丸める。
 * 退職日が空の場合は在職中とみなし、現在の月まで計算する。
 * @param {Array<{position_start: string, position_resigned: string}>} workExperienceRows
 * @returns {number|null} 没有可计算的区间时返回 null | Returns null when there is no period to calculate | 計算できる期間がない場合は null を返す
 */
function calculateWorkYears(workExperienceRows, currentDate = new Date()) {
  const currentMonthIndex = currentDate.getFullYear() * 12 + currentDate.getMonth();
  const monthRanges = [];
  for (const workExperience of workExperienceRows) {
    const startMonth = toMonthIndex(workExperience.position_start);
    if (startMonth === null) continue;
    const endMonth = workExperience.position_resigned ? toMonthIndex(workExperience.position_resigned) : currentMonthIndex;
    if (endMonth === null || endMonth < startMonth) continue;
    monthRanges.push([startMonth, endMonth]);
  }
  if (!monthRanges.length) return null;

  monthRanges.sort((rangeA, rangeB) => rangeA[0] - rangeB[0]);
  let totalMonths = 0;
  let currentRange = null;
  for (const [startMonth, endMonth] of monthRanges) {
    if (!currentRange) currentRange = [startMonth, endMonth];
    else if (startMonth <= currentRange[1]) currentRange[1] = Math.max(currentRange[1], endMonth);
    else {
      totalMonths += currentRange[1] - currentRange[0];
      currentRange = [startMonth, endMonth];
    }
  }
  totalMonths += currentRange[1] - currentRange[0];
  return Math.round((totalMonths / 12) * 10) / 10;
}

module.exports = {
  normalizeMobilePhone,
  normalizeLandlinePhone,
  normalizeEmailAddress,
  convertToIsoDate,
  parseNumberOrNull,
  parseIntegerOrNull,
  toTrimmedText,
  toMonthIndex,
  calculateWorkYears
};
