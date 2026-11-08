'use strict';
const test = require("node:test");
const assert = require("node:assert/strict");
const { openSqliteDatabase } = require("../src/database/SqliteDatabase");
const { applyPendingMigrations } = require("../src/database/MigrationRunner");
const { CompanyService } = require("../src/services/CompanyService");

function createCompanyServiceWithEmptyDatabase() {
  const database = openSqliteDatabase(":memory:");
  applyPendingMigrations(database);
  return { database, companyService: new CompanyService(database) };
}

test("companyCreate / companyGet / companiesSearch / companyUpdate", () => {
  const { companyService } = createCompanyServiceWithEmptyDatabase();
  const companyId = companyService.companyCreate({ company_name: "测试公司A", industry: "IT" });
  assert.equal(companyService.companyGet(companyId).company_name, "测试公司A");
  assert.equal(companyService.companiesSearch({ keyword: "测试" }).total, 1);
  assert.equal(companyService.companiesSearch({ keyword: "不存在" }).total, 0);
  companyService.companyUpdate(companyId, { industry: "制造" });
  assert.equal(companyService.companyGet(companyId).industry, "制造");
});

test("companyCreate rejects empty and duplicate names with business error codes", () => {
  const { companyService } = createCompanyServiceWithEmptyDatabase();
  assert.throws(() => companyService.companyCreate({ company_name: "  " }), { errorCode: "VALIDATION" });
  companyService.companyCreate({ company_name: "重复公司" });
  assert.throws(() => companyService.companyCreate({ company_name: "重复公司" }), { errorCode: "DUPLICATE" });
});

test("first contact becomes primary; a new primary replaces the old one", () => {
  const { companyService } = createCompanyServiceWithEmptyDatabase();
  const companyId = companyService.companyCreate({ company_name: "公司B" });
  const firstContactId = companyService.companyContactAdd(companyId, { contact_name: "张三" });
  const secondContactId = companyService.companyContactAdd(companyId, { contact_name: "李四" });
  let contacts = companyService.companyContactsList(companyId);
  assert.equal(contacts.find(contact => contact.id === firstContactId).is_primary, 1);
  assert.equal(contacts.find(contact => contact.id === secondContactId).is_primary, 0);
  companyService.companyContactUpdate(secondContactId, { is_primary: 1 });
  contacts = companyService.companyContactsList(companyId);
  assert.equal(contacts.filter(contact => contact.is_primary).length, 1);
  assert.equal(contacts.find(contact => contact.id === secondContactId).is_primary, 1);
});

test("companyDelete: physical delete without positions, soft delete with positions; contact in use cannot be deleted", () => {
  const { database, companyService } = createCompanyServiceWithEmptyDatabase();
  const emptyCompanyId = companyService.companyCreate({ company_name: "无职位公司" });
  assert.deepEqual(companyService.companyDelete(emptyCompanyId), { deleteMode: "deleted" });
  assert.throws(() => companyService.companyGet(emptyCompanyId), { errorCode: "NOT_FOUND" });

  const companyId = companyService.companyCreate({ company_name: "有职位公司" });
  const contactId = companyService.companyContactAdd(companyId, { contact_name: "王五" });
  database
    .prepare("INSERT INTO position_openings (position_uuid, company_id, contact_id, title, created_at, updated_at) VALUES ('p1', ?, ?, '岗位', 't', 't')")
    .run(companyId, contactId);
  assert.throws(() => companyService.companyContactDelete(contactId), { errorCode: "IN_USE" });
  assert.deepEqual(companyService.companyDelete(companyId), { deleteMode: "deactivated" });
  assert.equal(companyService.companyGet(companyId).status, "inactive");
});
