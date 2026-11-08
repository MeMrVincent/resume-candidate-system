# 猎头招聘与候选人管理系统 (Recruitment System)

> **语言导航 / Language Navigation / 言語ナビゲーション**  
> [English](README.md) | **简体中文** | [日本語](README.ja.md)

---

> **分支与版本演进说明 / Branch & Version Architecture Notice / ブランチおよびバージョン構成のご案内**  
> 
> 本项目的各版本完整业务代码、技术规格与发布包均通过独立版本分支进行管理。  
> The codebase, documentation, and releases of this project are managed across dedicated version branches.  
> 本プロジェクトの各バージョンの完全なソースコード、技術仕様書、およびリリース成果物は、独立したバージョンブランチにて管理されています。

---

## 📌 版本全景与分支导航

| 版本 | 分支 | 状态 | 核心能力 | 详细技术规划与架构文档 |
| :--- | :--- | :--- | :--- | :--- |
| **V1.0** | [`V1`](https://github.com/MeMrVincent/resume-candidate-system/tree/V1) | 历史归档 | 9,860 份 JSON 简历清洗入库、跨语言合并、SQLite FTS5 全文搜索、候选人 10 维详情抽屉 | [英文](https://github.com/MeMrVincent/resume-candidate-system/blob/V1/recruitment_system_development_plan.md) \| [中文](https://github.com/MeMrVincent/resume-candidate-system/blob/V1/recruitment_system_development_plan.cn.md) \| [日文](https://github.com/MeMrVincent/resume-candidate-system/blob/V1/recruitment_system_development_plan.ja.md) |
| **V2.0** | [`V2`](https://github.com/MeMrVincent/resume-candidate-system/tree/V2) | **最新稳定版** | 企业客户 CRM、职位需求、ATS 流程闭环（多轮面试/录用Offer/保用期结算）、严格模式冲突拦截、3大实时聚合视图、按需分包 i18n、Electron-builder 桌面单机打包交付 | [英文](https://github.com/MeMrVincent/resume-candidate-system/blob/V2/recruitment_system_development_plan.md) \| [中文](https://github.com/MeMrVincent/resume-candidate-system/blob/V2/recruitment_system_development_plan.cn.md) \| [日文](https://github.com/MeMrVincent/resume-candidate-system/blob/V2/recruitment_system_development_plan.ja.md) |
| **V3.0** | `V3` *(即将启动)* | 规划启动 | 深度 AI 语义向量人岗匹配（Vector Embedding）、自动化招聘工作流引擎、日历面试日程集成、全景人才效能洞察分析 | *见下方 V3 规划展望* |

---

## 🚀 分支快速通道

- **V2 分支（最新企业级生产版本）**:  
  👉 [https://github.com/MeMrVincent/resume-candidate-system/tree/V2](https://github.com/MeMrVincent/resume-candidate-system/tree/V2)
- **V1 分支（基础原型版本归档）**:  
  👉 [https://github.com/MeMrVincent/resume-candidate-system/tree/V1](https://github.com/MeMrVincent/resume-candidate-system/tree/V1)

---

## 🛠️ 克隆与分支切换指南

```bash
# 1. 克隆代码仓库
git clone https://github.com/MeMrVincent/resume-candidate-system.git
cd resume-candidate-system

# 2. 切换至 V2 最新企业版（推荐）
git checkout V2

# 3. 切换至 V1 基础版（归档）
git checkout V1
```

---

## 🔮 下一阶段里程碑：V3 版本规划展望

随着 V2 版本企业客户 CRM、职位开缺体系、ATS 闭环与全自动化测试打包的全面交付，我们即将正式启动 **V3 版本的研发与重构**：

1. **AI 智能人岗深度匹配与语义向量检索 (AI Semantic Matching)**：
   - 引入 Embedding 向量检索引擎，与现有 FTS5 Trigram 全文检索融合，实现深层语义理解、跨语言技能语义泛化与智能人岗推荐评分。
2. **自动化招聘流程与日程联动 (Workflow & Scheduling)**：
   - 候选人意向跟踪自动化流水线、面试通知与确认函自动生成、深度联动主流日历服务（Google Calendar / Outlook / iCal）。
3. **人才全景画像与顾问人效分析看板 (Talent Analytics)**：
   - 全流程招聘漏斗转化分析、入职成单周期统计、行业薪酬基准动态洞察与顾问效能数据看板。
4. **性能极致调优与跨端运行架构**：
   - 针对 10 万+ 级大规模候选人库进行查询性能专项调优，维持毫秒级极速响应。

---

## 🤝 AI 研发贡献致谢

- **Google DeepMind Antigravity**: 全栈架构设计、企业级 DDD 重构、动态路由 i18n 引擎、三语文档工程及全自动化 Git 流水线。
- **OpenAI Codex**: 数据清洗入库、跨语言履历合并、结构化模式搭建与测试脚手架。
- **Anthropic Claude**: 系统功能集成、边界条件排查与全量冒烟验证。
