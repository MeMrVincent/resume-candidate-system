'use strict';
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { parseResumeMergeV3 } = require("../candidate/resume/ResumeMergeV3Parser");
const { CandidateRepository } = require("../database/repositories/CandidateRepository");
const { getCurrentIsoTimestamp } = require("../common/DateTimeUtils");
const { generateUuid } = require("../common/SqlHelpers");
const { AppError } = require("../common/AppError");

const PROGRESS_REPORT_INTERVAL = 200;

/**
 * 严格模式下，文件产生警告时抛出，用于回滚该文件的事务；警告随异常带出，由调用方写入错误表。
 * Thrown in strict mode when a file produces warnings, to roll back that file's transaction; the warnings travel with the exception and the caller records them.
 * 厳格モードでファイルが警告を出したときに投げ、そのファイルのトランザクションをロールバックする。警告は例外に載せて運び、呼び出し側が記録する。
 */
class StrictModeRejection extends Error {
  constructor(warnings) {
    super("strict mode: file has warnings");
    this.warnings = warnings;
  }
}

/**
 * 候选人批量导入：读取 v3 JSON 文件 -> 解析 -> 写库。
 * - 每个文件一个事务，单个文件失败不影响其他文件；
 * - 文件内容哈希已导入过则跳过（可重复运行）；
 * - 解析/冲突警告写入 candidate_import_errors，供人工复核。
 * Bulk candidate import: read v3 JSON files -> parse -> write to the database.
 * - One transaction per file; a failing file does not affect the others;
 * - A file whose content hash was already imported is skipped (safe to re-run);
 * - Parse/conflict warnings are written to candidate_import_errors for manual review.
 * 候補者の一括インポート：v3 JSON ファイルを読み込み -> 解析 -> DB へ書き込み。
 * - ファイルごとに 1 トランザクション。失敗したファイルが他に影響しない。
 * - 内容ハッシュがインポート済みのファイルはスキップ（再実行しても安全）。
 * - 解析／競合の警告は candidate_import_errors に書き込み、人による確認に回す。
 */
class CandidateImportService {
  /**
   * @param database 数据库连接 | Database connection | データベース接続
   * @param showOpenDialog 打开系统选择框的函数(options) => Promise<{canceled, filePaths}>，由 main.js 注入；命令行导入时可不传 | Function that opens the system picker, injected by main.js; optional for command-line import | システムの選択ダイアログを開く関数。main.js が注入する。コマンドライン取り込みでは省略可
   */
  constructor(database, showOpenDialog = null) {
    this.database = database;
    this.showOpenDialog = showOpenDialog;
    this.candidateRepository = new CandidateRepository(database);
  }

  /**
   * @description 导入某目录下全部 .json 文件。options.onProgress(已处理, 总数)；options.maxFileCount 限制文件数（调试用）；options.strictMode 为 true 时，有任何警告的文件整份不写库
   * Imports every .json file in a directory. options.onProgress(processed, total); options.maxFileCount limits the number of files (for debugging); when options.strictMode is true, a file with any warning is not written at all
   * ディレクトリ内のすべての .json ファイルをインポートする。options.onProgress(処理済み, 総数)；options.maxFileCount でファイル数を制限（デバッグ用）；options.strictMode が true のとき、警告のあるファイルは一切書き込まない
   */
  importResumeDirectory(directoryPath, options = {}) {
    let fileNames = fs.readdirSync(directoryPath).filter(fileName => fileName.toLowerCase().endsWith(".json")).sort();
    if (options.maxFileCount) fileNames = fileNames.slice(0, options.maxFileCount);
    return this.importResumeFiles(directoryPath, fileNames, options);
  }

  /** @returns {{importBatchId, created, updated, skipped, failed, warnings}} 本批次统计 | Statistics of this batch | このバッチの統計 */
  importResumeFiles(directoryPath, fileNames, options = {}) {
    const resumeFileEntries = fileNames.map(fileName => ({ directoryPath, fileName }));
    return this.importResumeFileEntries(directoryPath, resumeFileEntries, options);
  }

  /**
   * @description 导入一批 {directoryPath, fileName}（文件可来自不同目录），记为同一个导入批次
   * Imports a list of {directoryPath, fileName} (files may come from different directories) as one import batch
   * {directoryPath, fileName} のリストを（ファイルは異なるディレクトリでもよい）1 つのインポートバッチとして取り込む
   */
  importResumeFileEntries(sourceDescription, resumeFileEntries, options = {}) {
    const importBatchId = this.createImportBatch(sourceDescription, resumeFileEntries.length);
    const statistics = { created: 0, updated: 0, skipped: 0, failed: 0, rejected: 0, warnings: 0 };

    resumeFileEntries.forEach((resumeFileEntry, fileIndex) => {
      this.importSingleResumeFile(importBatchId, resumeFileEntry.directoryPath, resumeFileEntry.fileName, statistics, Boolean(options.strictMode));
      const processedCount = fileIndex + 1;
      if (options.onProgress && processedCount % PROGRESS_REPORT_INTERVAL === 0) options.onProgress(processedCount, resumeFileEntries.length);
    });

    this.finishImportBatch(importBatchId, statistics);
    return { importBatchId, ...statistics };
  }

  /**
   * @description 【前端接口】弹出系统文件选择框，选择一个或多个 JSON 文件
   * [Frontend interface] Opens the system file picker to choose one or more JSON files
   * 【フロントエンド用インターフェース】システムのファイル選択ダイアログで JSON ファイルを 1 つ以上選ぶ
   * @returns {{canceled: boolean, selectedPaths: string[]}}
   */
  async candidateImportPickFiles() {
    const pickResult = await this.requireOpenDialog()({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    return { canceled: pickResult.canceled, selectedPaths: pickResult.filePaths || [] };
  }

  /**
   * @description 【前端接口】弹出系统文件夹选择框，选择一个存放 JSON 的文件夹
   * [Frontend interface] Opens the system folder picker to choose a folder that contains JSON files
   * 【フロントエンド用インターフェース】システムのフォルダ選択ダイアログで JSON を含むフォルダを選ぶ
   * @returns {{canceled: boolean, selectedPaths: string[]}}
   */
  async candidateImportPickDirectory() {
    const pickResult = await this.requireOpenDialog()({ properties: ["openDirectory"] });
    return { canceled: pickResult.canceled, selectedPaths: pickResult.filePaths || [] };
  }

  /**
   * @description 【前端接口】导入所选的文件/文件夹（文件夹取其下的 .json），结构与批量导入 v3 JSON 相同
   * [Frontend interface] Imports the chosen files/folders (for a folder, its .json files); same v3 JSON structure as bulk import
   * 【フロントエンド用インターフェース】選択したファイル／フォルダを取り込む（フォルダはその直下の .json）。構造は一括取り込みの v3 JSON と同じ
   * @param {string[]} selectedPaths 文件或文件夹的绝对路径 | Absolute paths of files or folders | ファイルまたはフォルダの絶対パス
   * @param {{strictMode?: boolean}} importOptions strictMode：有警告的文件不写库 | strictMode: files with warnings are not written | strictMode：警告のあるファイルは書き込まない
   */
  candidateImportRun(selectedPaths, importOptions = {}) {
    if (!Array.isArray(selectedPaths) || selectedPaths.length === 0) throw new AppError("VALIDATION", "请先选择要导入的文件或文件夹");
    const resumeFileEntries = this.expandToResumeFileEntries(selectedPaths);
    if (resumeFileEntries.length === 0) throw new AppError("VALIDATION", "所选位置下没有 .json 文件");
    return this.importResumeFileEntries(selectedPaths.join("; "), resumeFileEntries, { strictMode: Boolean(importOptions.strictMode) });
  }

  /** 【前端接口】导入批次历史，最新在前 | [Frontend interface] Import batch history, newest first | 【フロントエンド用インターフェース】インポートバッチ履歴（新しい順） */
  candidateImportBatchesList() {
    return this.database.prepare("SELECT * FROM candidate_import_batches ORDER BY id DESC LIMIT 100").all();
  }

  /** 【前端接口】某批次的警告/错误明细 | [Frontend interface] Warnings/errors of one batch | 【フロントエンド用インターフェース】あるバッチの警告／エラー明細 */
  candidateImportIssuesList(importBatchId) {
    return this.database
      .prepare("SELECT id, candidate_id, file_name, severity, error_code, message, detail_json, created_at FROM candidate_import_errors WHERE batch_id=? ORDER BY id LIMIT 2000")
      .all(importBatchId);
  }

  requireOpenDialog() {
    if (!this.showOpenDialog) throw new AppError("INTERNAL_ERROR", "当前环境不支持文件选择框");
    return this.showOpenDialog;
  }

  /** 文件按原样收录（须为 .json）；文件夹展开为其下的 .json | Files are kept as is (must be .json); folders expand to their .json files | ファイルはそのまま（.json のみ）、フォルダはその直下の .json に展開する */
  expandToResumeFileEntries(selectedPaths) {
    const resumeFileEntries = [];
    for (const selectedPath of selectedPaths) {
      if (!fs.existsSync(selectedPath)) throw new AppError("NOT_FOUND", `路径不存在：${selectedPath}`);
      if (fs.statSync(selectedPath).isDirectory()) {
        fs.readdirSync(selectedPath)
          .filter(fileName => fileName.toLowerCase().endsWith(".json"))
          .sort()
          .forEach(fileName => resumeFileEntries.push({ directoryPath: selectedPath, fileName }));
      } else if (selectedPath.toLowerCase().endsWith(".json")) {
        resumeFileEntries.push({ directoryPath: path.dirname(selectedPath), fileName: path.basename(selectedPath) });
      }
    }
    return resumeFileEntries;
  }

  importSingleResumeFile(importBatchId, directoryPath, fileName, statistics, isStrictMode = false) {
    let recordId = "";
    let contentHash = "";
    try {
      const fileBuffer = fs.readFileSync(path.join(directoryPath, fileName));
      contentHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      const resumeJson = JSON.parse(fileBuffer.toString("utf8"));
      recordId = resumeJson.record_id || "";

      const alreadyImportedCandidateId = this.findCandidateIdByImportedContentHash(contentHash);
      if (alreadyImportedCandidateId) {
        this.insertImportRecord(importBatchId, alreadyImportedCandidateId, fileName, recordId, contentHash, "skipped");
        statistics.skipped++;
        return;
      }

      const parsedCandidate = parseResumeMergeV3(resumeJson, fileName);
      const saveInTransaction = this.database.transaction(() => {
        const saveResult = this.candidateRepository.saveParsedCandidate(parsedCandidate);
        const allWarnings = [...parsedCandidate.warnings, ...saveResult.warnings];
        if (isStrictMode && allWarnings.length > 0) throw new StrictModeRejection(allWarnings);
        for (const warning of allWarnings) this.insertImportIssue(importBatchId, saveResult.candidateId, fileName, "warning", warning);
        this.insertImportRecord(importBatchId, saveResult.candidateId, fileName, recordId, contentHash, saveResult.isNewCandidate ? "created" : "updated");
        return { saveResult, warningCount: allWarnings.length };
      });
      const { saveResult, warningCount } = saveInTransaction();
      statistics[saveResult.isNewCandidate ? "created" : "updated"]++;
      statistics.warnings += warningCount;
    } catch (error) {
      if (error instanceof StrictModeRejection) {
        statistics.rejected++;
        statistics.warnings += error.warnings.length;
        for (const warning of error.warnings) this.insertImportIssue(importBatchId, null, fileName, "warning", warning);
        this.insertImportRecord(importBatchId, null, fileName, recordId, contentHash, "rejected");
        return;
      }
      statistics.failed++;
      this.insertImportIssue(importBatchId, null, fileName, "error", { warningCode: "parse_error", message: String(error.message || error), detail: {} });
      this.insertImportRecord(importBatchId, null, fileName, recordId, "", "failed");
    }
  }

  createImportBatch(directoryPath, totalFileCount) {
    const insertResult = this.database
      .prepare("INSERT INTO candidate_import_batches (batch_uuid, source_dir, total_files, started_at) VALUES (?,?,?,?)")
      .run(generateUuid(), directoryPath, totalFileCount, getCurrentIsoTimestamp());
    return Number(insertResult.lastInsertRowid);
  }

  finishImportBatch(importBatchId, statistics) {
    this.database
      .prepare(
        `UPDATE candidate_import_batches SET status='completed', created_count=?, updated_count=?, skipped_count=?,
           failed_count=?, rejected_count=?, warning_count=?, finished_at=? WHERE id=?`
      )
      .run(statistics.created, statistics.updated, statistics.skipped, statistics.failed, statistics.rejected, statistics.warnings, getCurrentIsoTimestamp(), importBatchId);
  }

  findCandidateIdByImportedContentHash(contentHash) {
    const importedRecord = this.database
      .prepare(
        `SELECT candidate_id FROM candidate_import_records
         WHERE content_hash=? AND result IN ('created','updated','skipped') AND candidate_id IS NOT NULL LIMIT 1`
      )
      .get(contentHash);
    return importedRecord ? importedRecord.candidate_id : null;
  }

  insertImportRecord(importBatchId, candidateId, fileName, recordId, contentHash, result) {
    this.database
      .prepare(
        `INSERT INTO candidate_import_records (batch_id, candidate_id, file_name, record_id, content_hash, result, created_at)
         VALUES (?,?,?,?,?,?,?)`
      )
      .run(importBatchId, candidateId, fileName, recordId, contentHash, result, getCurrentIsoTimestamp());
  }

  insertImportIssue(importBatchId, candidateId, fileName, severity, issue) {
    this.database
      .prepare(
        `INSERT INTO candidate_import_errors (batch_id, candidate_id, file_name, severity, error_code, message, detail_json, created_at)
         VALUES (?,?,?,?,?,?,?,?)`
      )
      .run(importBatchId, candidateId, fileName, severity, issue.warningCode, issue.message, JSON.stringify(issue.detail || {}), getCurrentIsoTimestamp());
  }
}

module.exports = { CandidateImportService };
