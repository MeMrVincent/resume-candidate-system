'use strict';

/**
 * @description 当前时间的 ISO 字符串（UTC），用于 created_at / updated_at
 * Current time as an ISO string (UTC), used for created_at / updated_at
 * 現在時刻の ISO 文字列（UTC）。created_at / updated_at に使う
 */
function getCurrentIsoTimestamp() {
  return new Date().toISOString();
}

/**
 * @description 本地今天的日期文本，格式 YYYY-MM-DD
 * Today's local date as text, format YYYY-MM-DD
 * ローカルの今日の日付テキスト。形式は YYYY-MM-DD
 */
function getTodayDateText() {
  const now = new Date();
  const padTwoDigits = number => String(number).padStart(2, "0");
  return `${now.getFullYear()}-${padTwoDigits(now.getMonth() + 1)}-${padTwoDigits(now.getDate())}`;
}

/**
 * @description 在日期上加天数
 * Adds days to a date
 * 日付に日数を加算する
 * @param {string} dateText YYYY-MM-DD
 * @param {number} dayCount 要加的天数 | Number of days to add | 加算する日数
 * @returns {string} YYYY-MM-DD
 */
function addDaysToDateText(dateText, dayCount) {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + dayCount)).toISOString().slice(0, 10);
}

module.exports = { getCurrentIsoTimestamp, getTodayDateText, addDaysToDateText };
