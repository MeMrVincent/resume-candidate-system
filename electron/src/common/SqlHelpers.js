'use strict';
const crypto = require("crypto");

/**
 * @description 生成 UUID，用于各主表的 *_uuid 字段
 * Generates a UUID for the *_uuid column of each main table
 * 各メインテーブルの *_uuid 列に使う UUID を生成する
 */
function generateUuid() {
  return crypto.randomUUID();
}

/**
 * @description 根据白名单构造 UPDATE 的 SET 片段，避免前端传入任意列名
 * Builds the SET fragment of an UPDATE from a whitelist, so the frontend cannot inject arbitrary column names
 * ホワイトリストから UPDATE の SET 部分を組み立て、フロントエンドが任意の列名を渡せないようにする
 * @param {object} fieldValues 要更新的字段 {列名: 值} | Fields to update {column: value} | 更新するフィールド {列名: 値}
 * @param {string[]} allowedColumnNames 允许更新的列名白名单 | Whitelist of updatable column names | 更新を許可する列名のホワイトリスト
 * @returns {{columnNames: string[], assignmentSql: string, values: any[]}}
 */
function buildUpdateAssignments(fieldValues, allowedColumnNames) {
  const columnNames = Object.keys(fieldValues).filter(
    columnName => allowedColumnNames.includes(columnName) && fieldValues[columnName] !== undefined
  );
  return {
    columnNames,
    assignmentSql: columnNames.map(columnName => `${columnName}=?`).join(", "),
    values: columnNames.map(columnName => fieldValues[columnName])
  };
}

/**
 * @description 判断是否为唯一约束冲突（兼容 better-sqlite3 与 node:sqlite 的报错文本）
 * Tells whether an error is a unique-constraint violation (works with the error text of both better-sqlite3 and node:sqlite)
 * 一意制約違反かどうかを判定する（better-sqlite3 と node:sqlite の両方のエラー文言に対応）
 */
function isUniqueConstraintError(error) {
  return /UNIQUE constraint failed/i.test((error && error.message) || "");
}

module.exports = { generateUuid, buildUpdateAssignments, isUniqueConstraintError };
