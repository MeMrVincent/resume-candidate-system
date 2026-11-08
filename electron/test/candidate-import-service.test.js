'use strict';
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { openSqliteDatabase } = require("../src/database/SqliteDatabase");
const { applyPendingMigrations } = require("../src/database/MigrationRunner");
const { CandidateImportService } = require("../src/services/CandidateImportService");

const sampleDirectoryPath = path.join(__dirname, "fixtures", "sample-v3");

function createImportServiceWithEmptyDatabase(showOpenDialog = null) {
  const database = openSqliteDatabase(":memory:");
  applyPendingMigrations(database);
  return new CandidateImportService(database, showOpenDialog);
}

test("candidateImportRun: a single file, then re-import is skipped by content hash", () => {
  const importService = createImportServiceWithEmptyDatabase();
  const firstFileName = fs.readdirSync(sampleDirectoryPath).filter(name => name.endsWith(".json"))[0];
  const filePath = path.join(sampleDirectoryPath, firstFileName);
  assert.equal(importService.candidateImportRun([filePath]).created, 1);
  assert.equal(importService.candidateImportRun([filePath]).skipped, 1);
  assert.equal(importService.candidateImportBatchesList().length, 2);
});

test("candidateImportRun: a folder imports all json files; invalid input is rejected", () => {
  const importService = createImportServiceWithEmptyDatabase();
  const jsonFileCount = fs.readdirSync(sampleDirectoryPath).filter(name => name.endsWith(".json")).length;
  const importResult = importService.candidateImportRun([sampleDirectoryPath]);
  assert.equal(importResult.created + importResult.failed, jsonFileCount);
  assert.equal(importResult.failed, 0);
  assert.throws(() => importService.candidateImportRun([]), { errorCode: "VALIDATION" });
  assert.throws(() => importService.candidateImportRun([path.join(os.tmpdir(), "no-such-path-xyz")]), { errorCode: "NOT_FOUND" });
  assert.ok(Array.isArray(importService.candidateImportIssuesList(importResult.importBatchId)));
});

test("candidateImportPickFiles / PickDirectory use the injected dialog", async () => {
  const importService = createImportServiceWithEmptyDatabase(async () => ({ canceled: false, filePaths: ["/a/b.json"] }));
  assert.deepEqual(await importService.candidateImportPickFiles(), { canceled: false, selectedPaths: ["/a/b.json"] });
  assert.deepEqual(await importService.candidateImportPickDirectory(), { canceled: false, selectedPaths: ["/a/b.json"] });
});

test("strict mode: a file with a contact conflict is rejected and not written; a clean file is imported", () => {
  const workDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), "v3-strict-"));
  const baseJson = JSON.parse(fs.readFileSync(path.join(sampleDirectoryPath, "艾华_13917035118.json"), "utf8"));
  const cleanJson = JSON.parse(JSON.stringify(baseJson));
  const conflictJson = JSON.parse(JSON.stringify(baseJson));
  conflictJson.record_id = "merge-v3-conflict";
  conflictJson.merge_info.primary_phone = "13900000000";
  conflictJson.merge_info.primary_email = "conflict@example.com";
  // 与 clean 的主手机号冲突 / Conflicts with the primary mobile of the clean file / clean ファイルの主携帯番号と競合する
  conflictJson.merge_info.other_phones = ["13917035118"];
  fs.writeFileSync(path.join(workDirectoryPath, "a_clean.json"), JSON.stringify(cleanJson));
  fs.writeFileSync(path.join(workDirectoryPath, "b_conflict.json"), JSON.stringify(conflictJson));

  const importService = createImportServiceWithEmptyDatabase();
  const strictResult = importService.importResumeDirectory(workDirectoryPath, { strictMode: true });
  assert.equal(strictResult.created, 1);
  assert.equal(strictResult.rejected, 1);
  assert.equal(importService.database.prepare("SELECT COUNT(*) n FROM candidate_profiles").get().n, 1);
  assert.equal(importService.database.prepare("SELECT COUNT(*) n FROM candidate_profiles WHERE record_id='merge-v3-conflict'").get().n, 0);
  const issues = importService.candidateImportIssuesList(strictResult.importBatchId);
  assert.ok(issues.some(issue => issue.file_name === "b_conflict.json" && issue.error_code === "contact_conflict"));

  // 被拒绝的文件不算已导入，非严格模式下可再次导入 / A rejected file does not count as imported and can be imported later in normal mode / 拒否されたファイルは取り込み済み扱いにならず、通常モードで再取り込みできる
  const retryResult = importService.importResumeDirectory(workDirectoryPath);
  assert.equal(retryResult.created, 1);
  assert.equal(retryResult.skipped, 1);
});
