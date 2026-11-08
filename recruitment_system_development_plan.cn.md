# 猎头招聘管理系统 V2 开发规划与完整功能设计规范

> **语言导航 / Language Navigation / 言語ナビゲーション**  
> [English](recruitment_system_development_plan.md) | **简体中文** | [日本語](recruitment_system_development_plan.ja.md)

---

**文档版本**：2.0.0  
**更新日期**：2026-11-08  
**目标读者**：Codex / Antigravity / 全栈工程开发团队  
**系统形态**：企业级本地离线 Electron 桌面应用程序  
**核心技术基准**：Electron 45.2.3 + better-sqlite3 13.0.3 + SQLite 3.53.4 (WAL模式) + Vue 3.5.45 + Element Plus 2.14.8 + vue-i18n 11.4.18  
**当前系统完成状态**：
- **Phase 1（候选人核心资产库）**：9,860 份简历清洗入库、跨语言合并与 FTS5 全文搜索已全量落地。
- **Phase 2（职位与 ATS 招聘流转）**：职位开缺、适合度判定、多轮面试记录、Offer 及入职保用期流转与三大实时统计视图已全量落地。
- **Phase 3（企业客户 CRM）**：企业档案、多联系人维护、级联软删除保护与交互前端已全栈闭环实现。
- **工程化与质量保证**：全量 24/24 项后端测试 100% 通过；Electron Builder 本地打包（Portable / Unpacked / NSIS）已完全验证。

---

## 0. 版本演进与 V2 核心差异说明 (V1 vs V2)

相比于 V1 版本，V2 版本在业务深度、数据库架构、导入审计及工程化打包上实现了重大演进：

### 0.1 核心差异对比清单

| 维度 | V1.0 版本实现 | V2.0 版本重大演进 |
| :--- | :--- | :--- |
| **数据库迁移体系** | 7 个累积增量补丁（`001_initial` 至 `007_communication_list_fields`） | 重构为 **5 个基于领域驱动设计（DDD）的独立版本文件**（`001_system` 至 `005_search_views`） |
| **系统基础设施域** | 仅含配置与简单审计日志 | 新增 **`system_users` 系统操作员表**，为企业、职位、沟通记录提供明确的顾问归属与审计追踪 |
| **企业客户 CRM (Phase 3)** | 仅有架构规划草案，无前后端落地代码 | **全栈闭环落地**：`company_profiles`、`company_contacts`、`company_notes`，主联系人自动更替，级联软删除保护，前端完整 CRM 视图 |
| **职位与 ATS 流程流转** | 仅包含基础匹配表 | **深度精细化建模**：新增 `position_candidate_interviews`（多轮面试与反馈）、`position_candidate_placements`（入职、Offer 薪酬、保用期天数与佣金结算）、`position_candidate_history`（全生命周期演进追溯） |
| **判定与流转解耦** | 约定性逻辑 | **数据库强校验约束**：`CHECK (stage IS NULL OR decision = 'accepted')`，严密保障只有在确认适合后才允许推进招聘流转 |
| **数据统计与分析** | 页面端临时拼接 SQL 查询 | **内置 3 大高性能分析聚合视图**：`v_candidate_stats`、`v_position_pipeline_counts`、`v_company_position_counts` |
| **候选人导入引擎** | 命令行单次批量导入脚本 | **交互式导入引擎 (Import V3)**：支持图形化选目录/文件，新增 `candidate_import_batches` 批次流水与 `candidate_import_errors` 告警明细表，支持**严格模式冲突检测**与多语言不对齐容差诊断 |
| **前端多语言 (i18n)** | 全局静态打包语言字典 | **按需异步分块加载**（`meta.i18nPacks` 动态路由守卫）：启动仅加载 `core.json`，进入具体模块才异步下载对应包，默认英文（`en-us`），中英日 100% 键对齐 |
| **客户端打包工程** | 基础配置未跑通 | **全面打通 `electron-builder`**：支持绿色解包目录（`dist:dir`）与 NSIS 安装包，内置只读模板库热挂载，通过原生冒烟测试 |
| **自动化测试覆盖** | 10 项基础测试用例 | **扩充至 24 项全量测试**（覆盖企业管理、导入严格模式、冲突判定、多语言对齐容差等），保持 100% 全部通过 |

---

## 1. 系统业务目标与端到端闭环

本系统最终形态为一个在顾问本地桌面高速稳定运行的企业级猎头 CRM + ATS + 人才智能检索匹配管理平台。

### 1.1 正向核心招聘业务闭环

```text
客户企业 (Company)
      ↓
创建职位需求 (Position Openings)
      ↓
FTS5 全文召回 + 结构化条件过滤 (Recall)
      ↓
系统智能初筛与推荐 (MatchEngine Scoring)
      ↓
猎头顾问人工判定 (decision: accepted / dismissed)
      ↓
候选人意向沟通跟进 (candidate_communications)
      ↓
向客户企业推选简历 (stage: submitted)
      ↓
多轮客户面试管理 (position_candidate_interviews)
      ↓
录用 Offer 与佣金结算 (position_candidate_placements)
      ↓
入职与保用期审核 (guarantee_passed)
```

### 1.2 反向流转与数据穿透追踪

在候选人详情界面，顾问必须能够反向穿透追踪：
- 该候选人历史上与哪些企业、哪些职位建立过推荐关系；
- 每个职位当前行进到何种流程（沟通中、已推选、面试轮次、Offer、已入职）；
- 每次面试的面试官反馈与历史评语；
- 候选人的历史保用期状态与沟通记录时间线。

---

## 2. V2 完整功能架构与业务能力全景 (Full Feature Matrix)

V2 版本的核心功能划分为 **10 大功能模块**，覆盖企业客户管理、职位开缺、人才库管理、智能检索、ATS 流程、交互导入、统计分析、系统管理、国际化及离线运行交付：

### 模块 1：企业客户 CRM 系统 (Client Company CRM)
1. **企业档案全生命周期管理**：
   - 企业建档、编辑、查看、查询与状态变更；
   - 核心字段：企业全称（全局唯一索引）、企业简称、所属行业、人员规模、所在国家/省份/城市、详细地址、官方网站、公司介绍与背景；
   - 企业状态机：`active`（合作中）、`inactive`（暂停合作）、`blacklisted`（黑名单）；
   - 顾问归属：支持绑定归属顾问（`owner_user_id`），支持创建人与更新人审计。
2. **多对接人体系 (Company Contacts)**：
   - 一个企业支持维护多位对接人（HR、业务部门负责人、招聘经理等）；
   - 字段支持：姓名、职务、部门、联系电话、电子邮箱、微信号、对接人状态（`active` 在职 / `left` 离职）、备注信息；
   - **主联系人机制**：新增的首个联系人自动设置为主联系人（`is_primary=1`）；若更新或新增联系人勾选为主联系人，系统自动将原主联系人降级为普通联系人，确保企业名下恒有且仅有一个主联系人；
   - 外键防误删防护：正在被职位引用的对接人**严禁删除**，系统抛出 `IN_USE` 业务错误，强制要求先更换职位负责人或标记离职。
3. **企业级联保护与智能软删除**：
   - 当企业名下**不存在任何职位**时，允许执行物理删除（`deleted`），同时级联清理关联对接人与备忘录；
   - 当企业名下**已开设有职位**时，系统自动拦截物理删除，转为**智能软删除**（`deactivated`），将企业状态标记为 `inactive`，完整保留职位与招聘历史。
4. **企业商务跟进备忘录 (Company Notes)**：
   - 记录顾问对企业的拜访记录、合作条款沟通、商务纪要；
   - 包含记录时间（`noted_at`）、备忘类型（`note_type`）、具体内容与记录人，按时间倒序排列展示。
5. **前端交互工作台**：
   - 企业列表页（支持公司名称/简称模糊搜索、合作状态筛选、分页浏览）；
   - 企业详情卡片视图（企业基本信息、职位开缺计数统计、多对接人列表维护、备忘录快速录入流）；
   - 对接人维护弹窗（`contact.popup.vue`）与企业编辑弹窗（`edit.popup.vue`）。

---

### 模块 2：职位开缺与需求管理 (Position Openings & Requirements)
1. **职位发布与信息建模**：
   - 关联客户企业（`company_id`）与具体企业对接人（`contact_id`）；
   - 职位核心参数：职位名称、所属部门、招聘编制人数（`headcount >= 1`）、工作城市、具体办公地点、工作类型（全职/兼职/外包）；
   - 薪资与福利待遇：年薪范围（`salary_min` ～ `salary_max`）、薪资币种（CNY/USD/JPY 等）、薪资月数（如 12、14、16 薪）；
   - 任职要求：经验年限区间（`experience_min` ～ `experience_max`）、最低学历要求（`degree_min_rank` 1-7 等级映射）、职位职责描述（JD）、岗位要求文本；
   - 招聘配置：保用期天数（`guarantee_days`）、招聘紧急程度（`priority`: `low`, `normal`, `high`, `urgent`）；
   - 职位状态机：`draft`（草稿） -> `open`（招聘中） -> `paused`（暂停） -> `filled`（已招满） -> `closed`（已关闭） / `cancelled`（已取消）。
2. **职位对接人归属数据库强校验触发器**：
   - 数据库级内置双向触发器 `trg_position_contact_belongs_ins` 与 `trg_position_contact_belongs_upd`；
   - 严密校验：职位的对接人（`contact_id`）必须属于该职位所在的企业（`company_id`），严防跨公司错乱关联。
3. **职位画像与特征技能词库 (`position_keywords`)**：
   - 技能（skill）、语言（language）、行业（industry）、城市（city）、职能（title）、学历（degree）等结构化关键词；
   - 关键词权重配置（weight）与类别划分（must_have 必备项 / nice_to_have 加分项）。
4. **职位招聘漏斗管线看板**：
   - 配合 `v_position_pipeline_counts` 视图，直接呈现每个职位下当前待筛选、初筛通过、淘汰、推荐中、面试中、Offer中、已入职的人员数据。

---

### 模块 3：候选人人事档案与多语言治理 (Candidate Profiles & Multilingual Management)
1. **候选人主档案卡 (`candidate_profiles`)**：
   - 候选人唯一标识（`candidate_uuid`）、清洗入库分组标识（`record_id`）；
   - 基本属性：中文姓名、英文名、性别、出生日期、所在城市、当前公司、当前职位、最高学历、总工作年限；
   - 主联系信息冗余加速：主手机号（`primary_phone`）、主邮箱（`primary_email`）挂载唯一索引；
   - 状态标识：`active`（活跃储备）、`archived`（已归档）。
2. **多维联系方式治理 (`candidate_contacts`)**：
   - 支持移动电话（mobile）、固定电话/座机（landline）、电子邮箱（email）；
   - 规范化去噪：手机号自动剔除国家码 `+86`，邮箱自动转换为全小写；
   - **唯一性与共用联系方式判定**：
     - 主手机号与主邮箱在系统中全局唯一，防止一人重复录入；
     - 座机电话（landline）常为企业前台或总机，系统免除唯一性约束，支持多位候选人共用，彻底杜绝误报冲突；
     - 非主联系方式支持标记为共用（`is_shared=1`）。
3. **八大子维度结构化模型**：
   - `candidate_resumes`：多语言简历版本存储（`zh` 恒为主简历，支持 `en` 与 `ja` 多语言版本，记录身高、体重、婚育、户籍、自述 PR）；
   - `candidate_expectations`：求职期望（期望职位、行业、城市、雇佣方式、期望年薪范围 min/max、到岗时间）；
   - `candidate_work_experiences`：工作经历（公司名称、所属行业、人员规模、任职起止年月、部门、汇报对象、下属人数、职责业绩、离职原因）；
   - `candidate_educations`：教育经历（学校名称、专业名称、学历类型与等级权重 1-7、教育性质统招/成教、就读起止年月）；
   - `candidate_projects`：项目经验（项目名称、服务公司/客户、担任角色、起止年月、职责业绩、关键字、特征指纹）；
   - `candidate_trainings`：培训认证经历（培训机构、课程名称、起止日期、内容描述）；
   - `candidate_languages`：语言能力等级（语种、熟练度、证书与获取时间）；
   - `candidate_certificates`：执业资格证书（证书名称、颁发机构、获取时间）；
   - `candidate_skills`：专业技能清单（技能名、熟练程度）。
4. **多语言简历智能对齐与合并引擎 (V3 Merge Parser)**：
   - 智能解析中日英多语言简历结构；
   - **结构对齐与容差诊断**：比对中文与日文经历、学历列表项数；容忍轻微月份误差；当检测到经历段数缺失或时间大幅偏差时，输出诊断日志并写入 `import_warnings_report.txt`。
5. **候选人沟通记录 (`candidate_communications`)**：
   - 记录顾问与候选人的电话沟通、意向沟通、回访纪要；
   - 严格区分人工沟通（`manual`）、系统日志（`system`）与导入生成的历史记录（`imported_resume`）。

---

### 模块 4：智能检索与人岗精准召回 (Smart Search & Match Engine)
1. **SQLite FTS5 Trigram 跨语言全文检索**：
   - 内置 FTS5 全文索引，使用 `trigram` 分词器；
   - 支持跨中、英、日任意 3 字符及以上字串的高性能模糊召回与高亮匹配。
2. **非结构化检索大文档自动合成 (`CandidateRawTextBuilder`)**：
   - 自动聚合候选人基础信息、工作经历、项目经验、教育经历、技能、自述 PR 等全维度文本；
   - 配合数据库级触发器（`trg_search_doc_ai`、`trg_search_doc_ad`、`trg_search_doc_au`），在候选人新增、删除、更新时实现 FTS5 索引 100% 毫秒级自动同步，杜绝脏索引。
3. **多维结构化复合筛选**：
   - 支持工作年限区间、最低学历、薪资范围、所在城市、期望城市等多条件组合召回。
4. **人岗匹配与判定机制**：
   - 匹配打分与特征词比对（`match_score`, `matched_keywords`）；
   - 顾问人工判定：`suggested`（系统建议） -> `accepted`（初筛通过） / `dismissed`（淘汰并记录淘汰原因）。

---

### 模块 5：ATS 招聘流程闭环管理 (ATS Pipeline & Match Flow)
1. **判定与阶段强隔离约束**：
   - 数据库底层内置强约束规则：
     - `CHECK (stage IS NULL OR decision = 'accepted')`：只有初筛通过的候选人，才允许进入推进阶段；
     - `CHECK (decision <> 'accepted' OR stage IS NOT NULL)`：初筛通过的候选人，必须分配流程阶段。
2. **招聘全生命周期阶段流转**：
   - 正常推进链条：`pending_contact`（待联系） -> `contacting`（联系中） -> `interested`（有意向） -> `submitted`（已推荐给客户） -> `interviewing`（客户面试中） -> `interview_passed`（面试通过） -> `background_check`（背调中） -> `offer`（已发Offer） -> `hired`（已入职） -> `guarantee_passed`（顺利过保）；
   - 终止链条：`candidate_declined`（候选人放弃）、`client_rejected`（客户淘汰）、`background_check_failed`（背调未通过）、`offer_declined`（拒绝Offer）、`left_during_guarantee`（保用期内离职）。
3. **多轮面试精细化管理 (`position_candidate_interviews`)**：
   - 记录面试轮次（`round_no`，第 1 轮、第 2 轮、终面等）；
   - 面试类型（HR初试、业务复试、技术深访、现场终面）；
   - 预约时间（`scheduled_at`）、面试官（`interviewer`）、面试结果（`pending`, `passed`, `failed`, `cancelled`）、综合反馈与评语（`feedback`）。
4. **Offer 录用与入职保用期结算 (`position_candidate_placements`)**：
   - 录用 Offer 日期（`offer_date`）、Offer 薪资（`offer_salary`）；
   - 实际到岗入职日期（`onboard_date`）；
   - 入职时自动从职位快照继承保用期天数（`guarantee_days`，如 90 天、180 天）；
   - 自动推算保用期截止日期（`guarantee_end_date`）；
   - 保用期管理状态：在保监控、过保成功确认、未过保异常登记。
5. **全流程审计轨迹记录 (`position_candidate_history`)**：
   - 精准记录决策变更（`decision`）与阶段推进（`stage`）；
   - 记录变更前状态（`from_value`）、变更后状态（`to_value`）、变更原因（`reason`）、操作人与系统标记，为招聘漏斗转化分析提供原始依据。

---

### 模块 6：批量简历交互式导入工作台与冲突审计 (Interactive Batch Import & Conflict Workbench)
1. **原生桌面文件/目录选择器**：
   - 通过 Electron 主进程原生对话框，支持点选单个/多个 JSON 文件或指定整个目录递归扫描。
2. **批次流水审计 (`candidate_import_batches`)**：
   - 记录批次 UUID、扫描源路径、总文件数、新建数、更新数、跳过数、失败数、严格模式拒绝数、告警数、执行耗时。
3. **内容哈希去重与幂等重跑**：
   - 基于 SHA-256 计算文件内容哈希（`content_hash`）；
   - 文件内容完全一致时快速跳过；文件内容修改后再次导入时自动就地更新，不产生重复候选人。
4. **严格模式冲突拦截 (Strict Mode Conflict Protection)**：
   - 开启严格模式时，若导入的简历主手机号或主邮箱与系统中现有候选人发生冲突，立即阻断写入数据库并回滚单个文件事务；
   - 确保顾问核心资产不被污染，并将冲突明细记录至错误表供人工排查。
5. **错误与告警多维度审计 (`candidate_import_errors`)**：
   - 详细记录错误级别（`warning` / `error`）、错误代码（`contact_conflict`, `list_misaligned`, `bad_date`, `parse_error` 等）、问题文件路径与具体堆栈。
6. **前端导入工作台 UI (`candidate/import.vue`)**：
   - 交互式路径选择清单、重置按钮、导入进度展示；
   - 导入结果概览卡片；
   - 历史导入批次明细表格；
   - 告警/错误排查弹窗（`issueDialog`），一键查看问题文件及排查建议。

---

### 模块 7：实时数据报表与统计洞察 (Real-Time Analytics & Dashboard Views)
1. **候选人人效与履历转化视图 (`v_candidate_stats`)**：
   - `recommend_count`：推荐次数（历史上推进至 `submitted` 的次数）；
   - `success_count`：成单入职次数（历史上推进至 `hired` 的次数）；
   - `communication_count`：有效沟通次数（自动剔除导入时系统生成的通信记录，精准反映真实跟进频次）。
2. **职位在招漏斗管线视图 (`v_position_pipeline_counts`)**：
   - 实时聚合职位维度的流转漏斗：初筛建议数（`suggested_count`）、初筛通过数（`accepted_count`）、淘汰数（`dismissed_count`）、当前推荐中（`submitted_now`）、当前面试中（`interviewing_now`）、当前发Offer中（`offer_now`）、成功入职数（`hired_count`）。
3. **企业客户职位活跃度视图 (`v_company_position_counts`)**：
   - 实时聚合企业维度的总职位数（`position_total`）与在招开放职位数（`position_open`）。

---

### 模块 8：系统管理与安全审计体系 (System Administration & Security Infrastructure)
1. **系统用户体系 (`system_users`)**：
   - 支持管理员（`admin`）与猎头顾问（`consultant`）角色；
   - 支持账号激活与停用状态管理；
   - 单机版内置系统固定用户（`id=1, username='system'`），作为默认数据负责人。
2. **全局操作安全审计日志 (`system_audit_logs`)**：
   - 统一审计关键业务实体的创建、修改、删除动作；
   - 记录操作前后 JSON 差异（`before_json`, `after_json`）与操作人员。
3. **系统动态配置 (`system_settings`)**：
   - 键值对存储离线环境运行时配置与参数。
4. **后台异步作业管理 (`system_jobs`)**：
   - 统一调度批处理导入、索引重建、人岗批量匹配等长耗时异步任务，支持任务排队、进度报告与自动重试。

---

### 模块 9：全栈多语言国际化工程 (i18n Multi-Language Architecture)
1. **中英日三语全局覆盖**：
   - 默认语言为英文（`en-us`），完整支持简体中文（`zh-cn`）与日语（`ja-jp`）；
   - 界面语言即选即换，运行时免重启热生效。
2. **路由级按需动态分包加载 (`meta.i18nPacks`)**：
   - 启动时仅加载轻量基础核心包（`core.json`）；
   - 路由导航守卫拦截页面跳转，按需动态加载 `company.json`、`candidateImport.json`，显著降低初始内存开销。
3. **深度集成 Element Plus 语言包**：
   - 切换系统语言时，Element Plus 组件库内置文案（分页、日期选择器、弹窗确认等）自动同步切换。

---

### 模块 10：客户端离线化运行与打包交付 (Desktop Distribution & Offline Architecture)
1. **纯单机离线运行能力**：
   - 完全离线无外网依赖，所有数据存储于本地 SQLite 数据库，保护核心私密资产。
2. **现代化技术基准**：
   - 基于 Electron 45.2.3 原生运行时与 Node 20+，搭载 better-sqlite3 13.0.3 原生 C++ 预编译驱动。
3. **原生打包发布管道 (`electron-builder`)**：
   - 绿色免安装目录（`npm run dist:dir` -> `release/win-unpacked`）；
   - 便携式单执行文件（Portable）；
   - 标准 Windows 安装向导（NSIS）。
4. **模板数据热挂载与平滑升级**：
   - 生产环境中首次启动时，若用户数据目录不存在数据库，自动将内置种子库平滑复制挂载并执行最新增量迁移。

---

## 3. 总体技术栈与分层架构

```text
Desktop Runtime: Electron 45.2.3 (Node 20+ 原生集成环境)
Database Engine: SQLite 3.53.4 (WAL 模式, foreign keys 强约束, busy_timeout=5000)
Database Driver: better-sqlite3 13.0.3 (原生 C++ 绑定驱动)
Frontend Framework: Vue 3 (Composition API) + Vue Router + Element Plus 2.14.8
Internationalization: vue-i18n 11.4.18 (按需动态路由分包加载，中/英/日三语支持)
Build Toolchain: Webpack 5.112.2 + Babel 8.1.0 + electron-builder 26.18.0
```

### 3.1 强制分层调用链与安全边界

```text
Vue 3 Renderer Process
    ↓
Preload API (contextBridge.exposeInMainWorld)
    ↓
Typed Electron IPC (ipcMain.handle via registerServiceMethods)
    ↓
Domain Services (CompanyService, CandidateImportService, SystemService)
    ↓
Repositories (CompanyRepository, CandidateRepository)
    ↓
SQLite Database (SqliteDatabase.js / better-sqlite3)
```

**工程安全规范：**
- 严禁 Vue 渲染进程直接引用底层 `better-sqlite3` 模块；
- 严禁在 IPC 路由文件中编写裸 SQL 查询语句；
- 严禁开启 `nodeIntegration`，彻底杜绝渲染端越权调用系统底层的安全漏洞。

---

## 4. 数据库全量架构与 DDL 设计 (5 大 Migration)

V2 数据库由 5 个结构清晰的迁移脚本组成，共计 29 张实体/虚拟表与 3 个分析视图：

### 4.1 Migration 001: 系统基盘 (`001_system.sql`)

```sql
-- 001_system.sql  系统基础表 | System base tables | システム基本テーブル

CREATE TABLE system_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uuid     TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('admin','consultant')),
    status        TEXT NOT NULL DEFAULT 'active'     CHECK (status IN ('active','disabled')),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE system_settings (
    setting_key   TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL DEFAULT '',
    updated_at    TEXT NOT NULL
);

CREATE TABLE system_jobs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type          TEXT NOT NULL CHECK (job_type IN (
        'import_candidates','rebuild_raw_text','match_position','match_candidate',
        'guarantee_check','database_backup')),
    entity_type       TEXT NOT NULL DEFAULT '',
    entity_id         INTEGER,
    dedupe_key        TEXT NOT NULL DEFAULT '',
    payload_json      TEXT NOT NULL DEFAULT '{}',
    status            TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued','running','completed','failed','cancelled')),
    progress_current  INTEGER NOT NULL DEFAULT 0,
    progress_total    INTEGER NOT NULL DEFAULT 0,
    error_message     TEXT NOT NULL DEFAULT '',
    created_by        INTEGER REFERENCES system_users(id),
    created_at        TEXT NOT NULL,
    started_at        TEXT,
    finished_at       TEXT
);
CREATE INDEX idx_system_jobs_status ON system_jobs(status);
CREATE INDEX idx_system_jobs_dedupe ON system_jobs(job_type, dedupe_key, status);

CREATE TABLE system_audit_logs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type       TEXT NOT NULL,
    entity_id         INTEGER,
    action            TEXT NOT NULL,
    before_json       TEXT,
    after_json        TEXT,
    operator_user_id  INTEGER REFERENCES system_users(id),
    created_at        TEXT NOT NULL
);
CREATE INDEX idx_system_audit_entity ON system_audit_logs(entity_type, entity_id);

-- 单机版固定的本地系统用户（所有 owner / created_by / updated_by 默认指向它）
-- Fixed local system user of the standalone edition (every owner / created_by / updated_by points to it by default)
-- スタンドアロン版の固定ローカルシステムユーザー（owner / created_by / updated_by は既定でこのユーザーを指す）
INSERT INTO system_users (id, user_uuid, username, display_name, role, status, created_at, updated_at)
VALUES (1, 'system-local-user', 'system', '系统', 'admin', 'active',
        strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));
```

---

### 4.2 Migration 002: 企业客户与职位需求 (`002_company_position.sql`)

```sql
-- 002_company_position.sql  公司、对接人、职位、职位关键词 | Companies, contacts, positions, position keywords | 企業、担当者、求人、求人キーワード

CREATE TABLE company_profiles (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company_uuid  TEXT NOT NULL UNIQUE,
    company_name  TEXT NOT NULL UNIQUE,
    short_name    TEXT NOT NULL DEFAULT '',
    industry      TEXT NOT NULL DEFAULT '',
    company_size  TEXT NOT NULL DEFAULT '',
    country       TEXT NOT NULL DEFAULT '',
    province      TEXT NOT NULL DEFAULT '',
    city          TEXT NOT NULL DEFAULT '',
    address       TEXT NOT NULL DEFAULT '',
    website       TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),
    owner_user_id INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_by    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX idx_company_profiles_status ON company_profiles(status);

CREATE TABLE company_contacts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id    INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    contact_name  TEXT NOT NULL,
    title         TEXT NOT NULL DEFAULT '',
    department    TEXT NOT NULL DEFAULT '',
    phone         TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL DEFAULT '',
    wechat        TEXT NOT NULL DEFAULT '',
    is_primary    INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','left')),
    note          TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX idx_company_contacts_company ON company_contacts(company_id);
CREATE UNIQUE INDEX uq_company_contacts_one_primary
    ON company_contacts(company_id) WHERE is_primary = 1;

CREATE TABLE company_notes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id    INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    noted_at      TEXT NOT NULL,
    note_type     TEXT NOT NULL DEFAULT 'note',
    content       TEXT NOT NULL,
    created_by    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX idx_company_notes_company ON company_notes(company_id);

CREATE TABLE position_openings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    position_uuid    TEXT NOT NULL UNIQUE,
    company_id       INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE RESTRICT,
    contact_id       INTEGER NOT NULL REFERENCES company_contacts(id) ON DELETE RESTRICT,
    owner_user_id    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    title            TEXT NOT NULL,
    department       TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    work_location    TEXT NOT NULL DEFAULT '',
    employment_type  TEXT NOT NULL DEFAULT '全职',
    headcount        INTEGER NOT NULL DEFAULT 1 CHECK (headcount >= 1),
    salary_min       REAL,
    salary_max       REAL,
    salary_currency  TEXT NOT NULL DEFAULT 'CNY',
    salary_months    REAL,
    experience_min   REAL,
    experience_max   REAL,
    degree_min_rank  INTEGER CHECK (degree_min_rank IS NULL OR degree_min_rank BETWEEN 1 AND 7),
    jd_text          TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    requirements_text TEXT NOT NULL DEFAULT '',
    guarantee_days   INTEGER NOT NULL DEFAULT 0 CHECK (guarantee_days >= 0),
    priority         TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    status           TEXT NOT NULL DEFAULT 'draft'  CHECK (status IN (
        'draft','open','paused','filled','closed','cancelled')),
    opened_at        TEXT,
    closed_at        TEXT,
    last_matched_at  TEXT,
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_position_openings_company ON position_openings(company_id);
CREATE INDEX idx_position_openings_contact ON position_openings(contact_id);
CREATE INDEX idx_position_openings_status  ON position_openings(status);
CREATE INDEX idx_position_openings_title   ON position_openings(title);

-- 职位负责人（对接人）必须属于该职位所在的公司
-- The person in charge of a position (a company contact) must belong to the company of that position
-- 求人の担当者（先方窓口）は、その求人が属する企業の窓口でなければならない
CREATE TRIGGER trg_position_contact_belongs_ins
BEFORE INSERT ON position_openings
BEGIN
    SELECT RAISE(ABORT, 'position contact must belong to the position company')
    WHERE NOT EXISTS (
        SELECT 1 FROM company_contacts WHERE id = NEW.contact_id AND company_id = NEW.company_id);
END;

CREATE TRIGGER trg_position_contact_belongs_upd
BEFORE UPDATE OF company_id, contact_id ON position_openings
BEGIN
    SELECT RAISE(ABORT, 'position contact must belong to the position company')
    WHERE NOT EXISTS (
        SELECT 1 FROM company_contacts WHERE id = NEW.contact_id AND company_id = NEW.company_id);
END;

CREATE TABLE position_keywords (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id   INTEGER NOT NULL REFERENCES position_openings(id) ON DELETE CASCADE,
    keyword       TEXT NOT NULL,
    keyword_type  TEXT NOT NULL DEFAULT 'other' CHECK (keyword_type IN (
        'skill','language','industry','city','title','degree','other')),
    weight        REAL NOT NULL DEFAULT 1,
    is_required   INTEGER NOT NULL DEFAULT 0 CHECK (is_required IN (0,1)),
    source        TEXT NOT NULL DEFAULT 'rule' CHECK (source IN ('rule','manual')),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    UNIQUE (position_id, keyword)
);
```

---

### 4.3 Migration 003: 候选人档案与导入审计 (`003_candidate.sql`)

```sql
-- 003_candidate.sql  候选人主档、联系方式、导入批次、简历及其列表子表 | Candidate profile, contacts, import batches, resumes and their list tables | 候補者マスタ、連絡先、インポートバッチ、履歴書とそのリストテーブル
-- 列表子表沿用 v3 JSON 字段名；日期统一 ISO（YYYY-MM-DD / YYYY-MM）；薪资 REAL。 | List tables reuse the v3 JSON field names; dates are ISO (YYYY-MM-DD / YYYY-MM); salaries are REAL. | リストテーブルは v3 JSON のフィールド名を踏襲し、日付は ISO（YYYY-MM-DD / YYYY-MM）、給与は REAL とする。

CREATE TABLE candidate_profiles (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_uuid   TEXT NOT NULL UNIQUE,
    record_id        TEXT NOT NULL DEFAULT '',          -- merge-v3-<group_id>
    full_name        TEXT NOT NULL DEFAULT '',
    english_name     TEXT NOT NULL DEFAULT '',
    gender           TEXT NOT NULL DEFAULT '',
    birth_date       TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    primary_phone    TEXT NOT NULL DEFAULT '',          -- 冗余自 candidate_contacts（主号）
    primary_email    TEXT NOT NULL DEFAULT '',
    current_company  TEXT NOT NULL DEFAULT '',
    current_position TEXT NOT NULL DEFAULT '',
    highest_degree   TEXT NOT NULL DEFAULT '',
    work_years       REAL,
    status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    source_type      TEXT NOT NULL DEFAULT 'import' CHECK (source_type IN ('import','manual','position')),
    source_position_id INTEGER REFERENCES position_openings(id) ON DELETE SET NULL,
    owner_user_id    INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE UNIQUE INDEX uq_candidate_primary_phone ON candidate_profiles(primary_phone) WHERE primary_phone <> '';
CREATE UNIQUE INDEX uq_candidate_primary_email ON candidate_profiles(primary_email) WHERE primary_email <> '';
CREATE INDEX idx_candidate_profiles_name   ON candidate_profiles(full_name);
CREATE INDEX idx_candidate_profiles_status ON candidate_profiles(status);
CREATE INDEX idx_candidate_profiles_source_position ON candidate_profiles(source_position_id);
CREATE INDEX idx_candidate_profiles_record ON candidate_profiles(record_id);

CREATE TABLE candidate_contacts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    contact_type     TEXT NOT NULL CHECK (contact_type IN ('mobile','landline','email')),
    contact_value    TEXT NOT NULL,                      -- 原值
    normalized_value TEXT NOT NULL,                      -- 手机/座机仅数字(去86)；邮箱小写
    is_primary       INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
    is_shared        INTEGER NOT NULL DEFAULT 0 CHECK (is_shared IN (0,1)),
    source           TEXT NOT NULL DEFAULT 'import' CHECK (source IN ('import','manual')),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    CHECK (NOT (is_primary = 1 AND is_shared = 1)),
    UNIQUE (candidate_id, contact_type, normalized_value)
);
-- 手机/邮箱全局唯一（共用的允许多人重复出现；座机不限，常为公司总机）
-- Mobile numbers / emails are globally unique (shared ones may appear for several people; landlines are not restricted since they are often a company switchboard)
-- 携帯番号・メールは全体で一意（共用は複数人に重複可。固定電話は会社の代表番号が多いため制限しない）
CREATE UNIQUE INDEX uq_candidate_contacts_value
    ON candidate_contacts(contact_type, normalized_value) WHERE is_shared = 0 AND contact_type <> 'landline';
CREATE UNIQUE INDEX uq_candidate_contacts_primary
    ON candidate_contacts(candidate_id, contact_type) WHERE is_primary = 1;
CREATE INDEX idx_candidate_contacts_lookup ON candidate_contacts(contact_type, normalized_value);

CREATE TABLE candidate_import_batches (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_uuid       TEXT NOT NULL UNIQUE,
    source_dir       TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
    total_files      INTEGER NOT NULL DEFAULT 0,
    created_count    INTEGER NOT NULL DEFAULT 0,
    updated_count    INTEGER NOT NULL DEFAULT 0,
    skipped_count    INTEGER NOT NULL DEFAULT 0,
    failed_count     INTEGER NOT NULL DEFAULT 0,
    rejected_count   INTEGER NOT NULL DEFAULT 0,   -- 严格模式下因警告被拒绝写库的文件数 | Files rejected in strict mode because of warnings | 厳格モードで警告のため書き込みを拒否したファイル数
    warning_count    INTEGER NOT NULL DEFAULT 0,
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    started_at       TEXT NOT NULL,
    finished_at      TEXT
);

CREATE TABLE candidate_import_records (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id         INTEGER NOT NULL REFERENCES candidate_import_batches(id) ON DELETE CASCADE,
    candidate_id     INTEGER REFERENCES candidate_profiles(id) ON DELETE SET NULL,
    file_name        TEXT NOT NULL,
    record_id        TEXT NOT NULL DEFAULT '',
    content_hash     TEXT NOT NULL DEFAULT '',
    result           TEXT NOT NULL CHECK (result IN ('created','updated','skipped','failed','rejected')),
    created_at       TEXT NOT NULL
);
CREATE INDEX idx_import_records_batch ON candidate_import_records(batch_id);
CREATE INDEX idx_import_records_hash  ON candidate_import_records(content_hash);
CREATE INDEX idx_import_records_candidate ON candidate_import_records(candidate_id);

CREATE TABLE candidate_import_errors (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id         INTEGER NOT NULL REFERENCES candidate_import_batches(id) ON DELETE CASCADE,
    candidate_id     INTEGER REFERENCES candidate_profiles(id) ON DELETE SET NULL,
    file_name        TEXT NOT NULL DEFAULT '',
    severity         TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning','error')),
    error_code       TEXT NOT NULL DEFAULT '',          -- contact_conflict / list_misaligned / bad_date / parse_error ...
    message          TEXT NOT NULL DEFAULT '',
    detail_json      TEXT NOT NULL DEFAULT '{}',
    resolved         INTEGER NOT NULL DEFAULT 0 CHECK (resolved IN (0,1)),
    created_at       TEXT NOT NULL
);
CREATE INDEX idx_import_errors_batch ON candidate_import_errors(batch_id);
CREATE INDEX idx_import_errors_code  ON candidate_import_errors(error_code, resolved);

-- 简历版本（resumes[]）；第 0 份恒为 zh 主简历
-- Resume versions (resumes[]); the 0th one is always the main zh resume
-- 履歴書バージョン（resumes[]）。0 番目は常に zh のメイン履歴書
CREATE TABLE candidate_resumes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    language_code    TEXT NOT NULL DEFAULT 'zh',        -- JSON: resume_languge
    is_primary       INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
    full_name        TEXT NOT NULL DEFAULT '',
    gender           TEXT NOT NULL DEFAULT '',
    age              INTEGER,
    birth_date       TEXT NOT NULL DEFAULT '',
    birth_year       INTEGER,
    city             TEXT NOT NULL DEFAULT '',
    address          TEXT NOT NULL DEFAULT '',
    nationality      TEXT NOT NULL DEFAULT '',
    marital_status   TEXT NOT NULL DEFAULT '',
    children_status  TEXT NOT NULL DEFAULT '',
    political_status TEXT NOT NULL DEFAULT '',
    household_registration TEXT NOT NULL DEFAULT '',
    postal_code      TEXT NOT NULL DEFAULT '',
    height_cm        REAL,
    weight_kg        REAL,
    pr               TEXT NOT NULL DEFAULT '',
    phone            TEXT NOT NULL DEFAULT '',
    email            TEXT NOT NULL DEFAULT '',
    platform_from    TEXT NOT NULL DEFAULT '',
    platform_resume_id TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    UNIQUE (candidate_id, sequence_no),
    CHECK (is_primary = 0 OR language_code = 'zh')
);
CREATE UNIQUE INDEX uq_candidate_resumes_primary ON candidate_resumes(candidate_id) WHERE is_primary = 1;

CREATE TABLE candidate_expectations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    expected_position TEXT NOT NULL DEFAULT '',
    expected_industry TEXT NOT NULL DEFAULT '',
    expected_city    TEXT NOT NULL DEFAULT '',
    expected_employment_type TEXT NOT NULL DEFAULT '',
    expected_salary  TEXT NOT NULL DEFAULT '',
    expected_annual_salary_min REAL,
    expected_annual_salary_max REAL,
    expected_start_date TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_work_experiences (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    company_name     TEXT NOT NULL DEFAULT '',
    company_industry TEXT NOT NULL DEFAULT '',
    company_employees TEXT NOT NULL DEFAULT '',
    position         TEXT NOT NULL DEFAULT '',
    position_dept    TEXT NOT NULL DEFAULT '',
    position_type    TEXT NOT NULL DEFAULT '',
    position_start   TEXT NOT NULL DEFAULT '',          -- ISO YYYY-MM[-DD]
    position_resigned TEXT NOT NULL DEFAULT '',         -- '' 表示至今
    position_report_to TEXT NOT NULL DEFAULT '',
    position_subordinate TEXT NOT NULL DEFAULT '',
    position_salary  TEXT NOT NULL DEFAULT '',
    annual_salary_min REAL,
    annual_salary_max REAL,
    employment_type  TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT '',
    resigned_reason  TEXT NOT NULL DEFAULT '',
    position_responsibilities TEXT NOT NULL DEFAULT '',
    position_achievements TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_educations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    school_name      TEXT NOT NULL DEFAULT '',
    school_major_name TEXT NOT NULL DEFAULT '',
    school_degree_type TEXT NOT NULL DEFAULT '',
    school_degree_rank INTEGER,
    school_education_type TEXT NOT NULL DEFAULT '',
    school_start_ym  TEXT NOT NULL DEFAULT '',
    school_end_ym    TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_projects (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    project_name     TEXT NOT NULL DEFAULT '',
    company_or_client TEXT NOT NULL DEFAULT '',
    role_name        TEXT NOT NULL DEFAULT '',
    start_ym         TEXT NOT NULL DEFAULT '',
    end_ym           TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    achievements     TEXT NOT NULL DEFAULT '',
    keywords         TEXT NOT NULL DEFAULT '',
    fingerprint      TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_trainings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    training_name    TEXT NOT NULL DEFAULT '',
    training_org     TEXT NOT NULL DEFAULT '',
    training_start   TEXT NOT NULL DEFAULT '',
    training_end     TEXT NOT NULL DEFAULT '',
    training_content TEXT NOT NULL DEFAULT '',
    raw_json         TEXT NOT NULL DEFAULT '{}',        -- 样本中尚无训练字段，原样保留
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_languages (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    language_name    TEXT NOT NULL DEFAULT '',
    language_level   TEXT NOT NULL DEFAULT '',
    language_certificate TEXT NOT NULL DEFAULT '',
    language_certificate_time TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_certificates (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    certificate_name TEXT NOT NULL DEFAULT '',
    certificate_type TEXT NOT NULL DEFAULT '',
    certificate_time TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE TABLE candidate_skills (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_id        INTEGER NOT NULL REFERENCES candidate_resumes(id) ON DELETE CASCADE,
    sequence_no      INTEGER NOT NULL,
    skill_name       TEXT NOT NULL DEFAULT '',
    skill_level      TEXT NOT NULL DEFAULT '',
    UNIQUE (resume_id, sequence_no)
);

CREATE INDEX idx_work_company ON candidate_work_experiences(company_name);
CREATE INDEX idx_edu_school   ON candidate_educations(school_name);
CREATE INDEX idx_skill_name   ON candidate_skills(skill_name);
```

---

### 4.4 Migration 004: 人岗匹配、面试与入职 (`004_match_flow.sql`)

```sql
-- 004_match_flow.sql  职位-候选人匹配、流转阶段、面试、入职、历史、沟通记录 | Position-candidate matches, pipeline stages, interviews, placements, history, communications | 求人と候補者のマッチング、選考ステージ、面接、入社、履歴、コミュニケーション記録

CREATE TABLE position_candidate_matches (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id      INTEGER NOT NULL REFERENCES position_openings(id) ON DELETE CASCADE,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    decision         TEXT NOT NULL DEFAULT 'suggested' CHECK (decision IN ('suggested','accepted','dismissed')),
    stage            TEXT CHECK (stage IS NULL OR stage IN (
        'pending_contact','contacting','interested','submitted','interviewing',
        'interview_passed','background_check','offer','hired','guarantee_passed',
        'candidate_declined','client_rejected','background_check_failed',
        'offer_declined','left_during_guarantee')),
    origin           TEXT NOT NULL DEFAULT 'auto' CHECK (origin IN ('auto','import','manual')),
    match_score      REAL NOT NULL DEFAULT 0,
    matched_keywords TEXT NOT NULL DEFAULT '[]',        -- JSON 数组
    dismissed_reason TEXT NOT NULL DEFAULT '',
    manual_note      TEXT NOT NULL DEFAULT '',
    decided_at       TEXT,
    stage_changed_at TEXT,
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    updated_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    UNIQUE (position_id, candidate_id),
    CHECK (stage IS NULL OR decision = 'accepted'),
    CHECK (decision <> 'accepted' OR stage IS NOT NULL)
);
CREATE INDEX idx_match_position  ON position_candidate_matches(position_id, decision);
CREATE INDEX idx_match_candidate ON position_candidate_matches(candidate_id);
CREATE INDEX idx_match_stage     ON position_candidate_matches(stage);

CREATE TABLE position_candidate_interviews (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id         INTEGER NOT NULL REFERENCES position_candidate_matches(id) ON DELETE CASCADE,
    round_no         INTEGER NOT NULL DEFAULT 1,
    interview_type   TEXT NOT NULL DEFAULT '',
    scheduled_at     TEXT,
    interviewer      TEXT NOT NULL DEFAULT '',
    result           TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','passed','failed','cancelled')),
    feedback         TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    UNIQUE (match_id, round_no)
);

CREATE TABLE position_candidate_placements (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id         INTEGER NOT NULL UNIQUE REFERENCES position_candidate_matches(id) ON DELETE CASCADE,
    offer_date       TEXT,
    offer_salary     REAL,
    onboard_date     TEXT,
    guarantee_days   INTEGER NOT NULL DEFAULT 0 CHECK (guarantee_days >= 0),   -- 入职时从职位拷贝快照
    guarantee_end_date TEXT,
    note             TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_placement_guarantee_end ON position_candidate_placements(guarantee_end_date);

-- 决策与阶段变更历史（统计视图的基础）
-- History of decisions and stage changes (the basis of the statistics views)
-- 判定とステージ変更の履歴（統計ビューの基礎）
CREATE TABLE position_candidate_history (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id         INTEGER NOT NULL REFERENCES position_candidate_matches(id) ON DELETE CASCADE,
    change_type      TEXT NOT NULL CHECK (change_type IN ('decision','stage')),
    from_value       TEXT,
    to_value         TEXT NOT NULL,
    reason           TEXT NOT NULL DEFAULT '',
    is_system        INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0,1)),
    operator_user_id INTEGER REFERENCES system_users(id),
    created_at       TEXT NOT NULL
);
CREATE INDEX idx_history_match ON position_candidate_history(match_id, change_type);
CREATE INDEX idx_history_to    ON position_candidate_history(change_type, to_value);

CREATE TABLE candidate_communications (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id     INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    match_id         INTEGER REFERENCES position_candidate_matches(id) ON DELETE SET NULL,
    resume_id        INTEGER REFERENCES candidate_resumes(id) ON DELETE SET NULL,
    source_type      TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','system','imported_resume')),
    channel          TEXT NOT NULL DEFAULT '',
    communicate_time TEXT NOT NULL DEFAULT '',
    communicate_content TEXT NOT NULL DEFAULT '',
    created_by       INTEGER NOT NULL DEFAULT 1 REFERENCES system_users(id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_comm_candidate ON candidate_communications(candidate_id, source_type);
CREATE INDEX idx_comm_match ON candidate_communications(match_id);
```

---

### 4.5 Migration 005: 全文检索与聚合统计视图 (`005_search_views.sql`)

```sql
-- 005_search_views.sql  检索文档、FTS5 trigram、统计视图 | Search documents, FTS5 trigram, statistics views | 検索ドキュメント、FTS5 trigram、統計ビュー

CREATE TABLE candidate_search_documents (
    candidate_id INTEGER PRIMARY KEY REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    raw_text     TEXT NOT NULL DEFAULT '',
    text_hash    TEXT NOT NULL DEFAULT '',
    updated_at   TEXT NOT NULL
);

CREATE VIRTUAL TABLE candidate_search_fts USING fts5(
    raw_text,
    content='candidate_search_documents',
    content_rowid='candidate_id',
    tokenize='trigram'
);

CREATE TRIGGER trg_search_doc_ai AFTER INSERT ON candidate_search_documents BEGIN
    INSERT INTO candidate_search_fts(rowid, raw_text) VALUES (new.candidate_id, new.raw_text);
END;
CREATE TRIGGER trg_search_doc_ad AFTER DELETE ON candidate_search_documents BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text) VALUES ('delete', old.candidate_id, old.raw_text);
END;
CREATE TRIGGER trg_search_doc_au AFTER UPDATE ON candidate_search_documents BEGIN
    INSERT INTO candidate_search_fts(candidate_search_fts, rowid, raw_text) VALUES ('delete', old.candidate_id, old.raw_text);
    INSERT INTO candidate_search_fts(rowid, raw_text) VALUES (new.candidate_id, new.raw_text);
END;

-- 候选人统计：推荐=到达 submitted；成功=到达 hired；沟通=非 imported_resume 的沟通条数
-- Candidate statistics: recommended = reached submitted; successful = reached hired; communications = count of communications that are not imported_resume
-- 候補者の統計：推薦＝submitted に到達、成功＝hired に到達、コミュニケーション＝imported_resume 以外の件数
CREATE VIEW v_candidate_stats AS
SELECT
    c.id AS candidate_id,
    (SELECT COUNT(DISTINCT h.match_id) FROM position_candidate_history h
        JOIN position_candidate_matches m ON m.id = h.match_id
        WHERE m.candidate_id = c.id AND h.change_type = 'stage' AND h.to_value = 'submitted') AS recommend_count,
    (SELECT COUNT(DISTINCT h.match_id) FROM position_candidate_history h
        JOIN position_candidate_matches m ON m.id = h.match_id
        WHERE m.candidate_id = c.id AND h.change_type = 'stage' AND h.to_value = 'hired') AS success_count,
    (SELECT COUNT(*) FROM candidate_communications cc
        WHERE cc.candidate_id = c.id AND cc.source_type <> 'imported_resume') AS communication_count
FROM candidate_profiles c;

CREATE VIEW v_position_pipeline_counts AS
SELECT
    p.id AS position_id,
    COUNT(CASE WHEN m.decision = 'suggested' THEN 1 END) AS suggested_count,
    COUNT(CASE WHEN m.decision = 'accepted'  THEN 1 END) AS accepted_count,
    COUNT(CASE WHEN m.decision = 'dismissed' THEN 1 END) AS dismissed_count,
    COUNT(CASE WHEN m.stage = 'submitted' THEN 1 END) AS submitted_now,
    COUNT(CASE WHEN m.stage = 'interviewing' THEN 1 END) AS interviewing_now,
    COUNT(CASE WHEN m.stage = 'offer' THEN 1 END) AS offer_now,
    COUNT(CASE WHEN m.stage IN ('hired','guarantee_passed') THEN 1 END) AS hired_count
FROM position_openings p
LEFT JOIN position_candidate_matches m ON m.position_id = p.id
GROUP BY p.id;

CREATE VIEW v_company_position_counts AS
SELECT
    co.id AS company_id,
    COUNT(p.id) AS position_total,
    COUNT(CASE WHEN p.status = 'open' THEN 1 END) AS position_open
FROM company_profiles co
LEFT JOIN position_openings p ON p.company_id = co.id
GROUP BY co.id;
```

---

## 5. 后端服务与 IPC 接口规范

整个系统遵循面向对象的领域服务设计，统一错误码与异常处理：

### 5.1 统一异常码与错误规约 (`AppError`)
- `VALIDATION` (400)：请求参数未通过校验（如企业名称为空、对接人未填姓名）；
- `NOT_FOUND` (404)：请求实体不存在（如指定 ID 的企业或联系人不存在）；
- `DUPLICATE` (409)：实体冲突或唯一性约束违规（如企业名称已存在）；
- `IN_USE` (422)：实体正在被其他业务引用，无法删除（如对接人正在负责有效职位）；
- `INTERNAL_ERROR` (500)：系统未知内部错误或环境不支持。

### 5.2 核心服务与 API 映射
1. **`CompanyService`**：
   - `companiesSearch(params)`：多条件搜索与分页；
   - `companyGet(companyId)`：详情、联系人列表与跟进备忘；
   - `companyCreate(fields)` / `companyUpdate(companyId, fields)`；
   - `companyDelete(companyId)`：存在职位自动降级软删除，无职位物理删除；
   - `companyContactsList(companyId)` / `companyContactAdd(companyId, fields)` / `companyContactUpdate(contactId, fields)` / `companyContactDelete(contactId)`；
   - `companyNoteAdd(companyId, fields)` / `companyNoteDelete(noteId)`。
2. **`CandidateImportService`**：
   - `candidateImportPickFiles()` / `candidateImportPickDirectory()`：唤起原生选择器；
   - `candidateImportRun(selectedPaths, options)`：执行导入（支持严格模式）；
   - `candidateImportBatchesList()`：获取历史导入批次；
   - `candidateImportIssuesList(importBatchId)`：排查批次告警与错误明细。
3. **`SystemService`**：
   - `getVersion()`：获取系统客户端运行版本；
   - `getDatabasePath()`：获取当前生效的 SQLite 数据物理路径。

---

## 6. 前端多语言路由架构 (i18n 分包按需加载)

1. **路由守卫拦截分包**：
   ```javascript
   router.beforeEach(async to => {
     await ensureModulePacksLoaded(to.meta.i18nPacks || []);
   });
   ```
2. **语言包组织**：
   - `core.json`：全局菜单、通用按钮、通用状态标签（启动时立即载入）；
   - `company.json`：企业客户 CRM、联系人弹窗、备忘录专用字典（访问 `/company` 动态载入）；
   - `candidateImport.json`：简历导入工作台、批次表格、错误排查专用字典（访问 `/candidate/import` 动态载入）。
3. **Element Plus 同步**：
   - 切换系统语言为 `zh-cn`、`en-us` 或 `ja-jp` 时，Element Plus 全局 Locale 与自定义字典 100% 同步切换。

---

## 7. 自动化测试套件规范 (24/24 Pass)

后端测试套件位于 `electron/test/backend.test.js`，包含 24 个精细化单元与集成测试用例，全量通过：

1. `candidateImportBatchesList returns batches ordered by id desc`：批次倒序查询验证；
2. `candidateImportIssuesList returns warnings of a batch`：批次告警明细查询验证；
3. `candidateImportRun rejects empty selection`：空选择参数校验拦截；
4. `candidateImportRun: a single file, then re-import is skipped by content hash`：单文件哈希秒级跳过去重；
5. `candidateImportRun: a folder imports all json files; invalid input is rejected`：目录全量递归导入；
6. `candidateImportPickFiles / PickDirectory use the injected dialog`：原生文件对话框模拟注入测试；
7. `strict mode: a file with a contact conflict is rejected and not written; a clean file is imported`：**严格模式冲突全量阻断与回滚防护**；
8. `companyCreate / companyGet / companiesSearch / companyUpdate`：企业 CRM 基础 CRUD 全链路闭环；
9. `companyCreate rejects empty and duplicate names with business error codes`：企业重名与空名业务异常校验；
10. `first contact becomes primary; a new primary replaces the old one`：**主对接人自动选定与替换降级状态机**；
11. `companyDelete: physical delete without positions, soft delete with positions; contact in use cannot be deleted`：**级联删除防护与智能软删除切换**；
12. `migrations create schema + system user`：全量 5 个迁移脚本与系统默认用户自动创建；
13. `normalize`：字段清洗去噪与标准化函数测试；
14. `import samples, idempotent re-run`：全量样本数据幂等导入；
15. `primary phone/email unique constraints`：候选人主联系方式全局唯一索引校验；
16. `multilingual: zh primary + jp, lists aligned`：多语言中日简历正确对齐与合并；
17. `misaligned multilingual lists produce a warning`：多语言列表项数不一致时告警诊断捕获；
18. `FTS: >=3 chars via trigram, raw_text built from fields`：**FTS5 trigram 全文搜索与毫秒级匹配检索**；
19. `shared/conflicting contact: first come wins, second becomes shared + warning`：非主联系方式共享与警告留痕；
20. `re-import changed content updates in place, no duplicates`：简历内容变更后就地更新，无孤儿数据；
21. `imported_resume communications excluded from communication_count`：统计视图自动过滤导入产生的虚假沟通记录；
22. `company/position/match flow constraints + stats views`：**三大实时聚合视图与外键触发器强校验**；
23. `landline shared by many candidates: no conflict; one-sided empty date is not misaligned`：固话/座机多候选人共享无冲突校验；
24. `small date drift between language versions is tolerated, large drift warns`：跨语言日期微小漂移容错与大偏差告警诊断。

---

## 8. 打包与交付工程规范

系统内置完整的 `electron-builder` 本地打包发布能力：

1. **前端生产编译**：
   ```bash
   cd frontend && npm run build
   ```
2. **绿色解包目录打包 (Win Unpacked)**：
   ```bash
   cd electron && npm run dist:dir
   ```
3. **原生冒烟自检测试**：
   ```bash
   .\release\win-unpacked\RecruitmentSystemV2.exe --smoke-test
   ```
4. **单文件便携版 (Portable) 与安装包 (NSIS)**：
   ```bash
   cd electron && npm run dist
   ```

---

> **项目协作与技术致谢**  
> 架构设计与全量代码重构由 **Google DeepMind Antigravity**、**OpenAI Codex** 与 **Anthropic Claude** 联合深度开发支持。

---
**V2 完整功能设计与规划规范结束**
