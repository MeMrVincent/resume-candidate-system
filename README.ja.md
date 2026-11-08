# 人材紹介・採用管理システム (Recruitment System)

> **言語ナビゲーション / Language Navigation / 语言导航**  
> [English](README.md) | [简体中文](README.cn.md) | **日本語**

---

> **ブランチおよびバージョン構成のご案内 / Branch & Version Architecture Notice / 分支与版本演进说明**  
> 
> 本プロジェクトの各バージョンの完全なソースコード、技術仕様書、およびリリース成果物は、独立したバージョンブランチにて管理されています。  
> The codebase, documentation, and releases of this project are managed across dedicated version branches.  
> 本项目的各版本完整业务代码、技术规格与发布包均通过独立版本分支进行管理。

---

## 📌 バージョン全景とブランチナビゲーション

| バージョン | ブランチ | ステータス | 主要機能 | 技術仕様・設計仕様書 |
| :--- | :--- | :--- | :--- | :--- |
| **V1.0** | [`V1`](https://github.com/MeMrVincent/resume-candidate-system/tree/V1) | アーカイブ | 9,860件のJSON履歴書クレンジング・取り込み、多言語履歴書マージ、SQLite FTS5全文検索、候補者10次元詳細ドロワー | [英語](https://github.com/MeMrVincent/resume-candidate-system/blob/V1/recruitment_system_development_plan.md) \| [中国語](https://github.com/MeMrVincent/resume-candidate-system/blob/V1/recruitment_system_development_plan.cn.md) \| [日本語](https://github.com/MeMrVincent/resume-candidate-system/blob/V1/recruitment_system_development_plan.ja.md) |
| **V2.0** | [`V2`](https://github.com/MeMrVincent/resume-candidate-system/tree/V2) | **最新安定版** | クライアント企業CRM、求人要件管理、ATS選考パイプライン流転（面接/内定/保証期間決済）、厳格モード衝突防止、3大リアルタイム集計ビュー、オンデマンドi18n、Electron-builderローカルパッケージング配布 | [英語](https://github.com/MeMrVincent/resume-candidate-system/blob/V2/recruitment_system_development_plan.md) \| [中国語](https://github.com/MeMrVincent/resume-candidate-system/blob/V2/recruitment_system_development_plan.cn.md) \| [日本語](https://github.com/MeMrVincent/resume-candidate-system/blob/V2/recruitment_system_development_plan.ja.md) |
| **V3.0** | `V3` *(近日開始)* | 計画中 | 高度AIセマンティックベクトルマッチング（Vector Embedding）、選考自動化ワークフローエンジン、面接カレンダー連携、人材アナリティクス | *下記 V3 計画ロードマップ参照* |

---

## 🚀 ブランチクイックリンク

- **V2 ブランチ（最新エンタープライズ本番版）**:  
  👉 [https://github.com/MeMrVincent/resume-candidate-system/tree/V2](https://github.com/MeMrVincent/resume-candidate-system/tree/V2)
- **V1 ブランチ（初期プロトタイプアーカイブ）**:  
  👉 [https://github.com/MeMrVincent/resume-candidate-system/tree/V1](https://github.com/MeMrVincent/resume-candidate-system/tree/V1)

---

## 🛠️ クローンおよびブランチ切り替えガイド

```bash
# 1. リポジトリをクローン
git clone https://github.com/MeMrVincent/resume-candidate-system.git
cd resume-candidate-system

# 2. 最新の V2 エンタープライズ版に切り替え（推奨）
git checkout V2

# 3. 基礎的な V1 版に切り替え
git checkout V1
```

---

## 🔮 次期マイルストーン：V3 バージョン開発ロードマップ

V2 バージョン（企業 CRM、求人案件管理、ATS 閉ループ、厳格な衝突防止、完全オフラインパッケージング）の納品完了に伴い、近日中に **V3 バージョンの研究開発および再構築** を開始します：

1. **AI 搭載セマンティックベクトルマッチング (AI Semantic Matching)**:
   - 現行の FTS5 trigram 全文検索に加え、Embedding ベクトル検索エンジンを導入。深い文脈理解と高精度な求人・候補者マッチングスコアリングを実現。
2. **採用業務ワークフロー自動化およびカレンダー連携 (Workflow & Scheduling)**:
   - 候補者アプローチの自動化パイプライン、面接案内・確認状の自動生成、主要カレンダーサービス（Google Calendar / Outlook / iCal）との連携。
3. **人材アナリティクスとコンサルタント生産性分析 (Talent Analytics)**:
   - 選考ファネル分析、成約リードタイム統計、業界給与ベンチマーク分析ダッシュボード。
4. **検索エンジンの超高速チューニング**:
   - 10万件以上の大規模候補者プールに対してもミリ秒単位のレスポンスを維持するパフォーマンス最適化。

---

## 🤝 AI 共同開発クレジット・謝辞

- **Google DeepMind Antigravity**: フルスタックアーキテクチャ設計、DDD ドメイン再構築、動的ルーティング i18n エンジン、3言語ドキュメント整備、自動 Git 配布パイプライン。
- **OpenAI Codex**: データクレンジング・取り込み、多言語履歴書マージ、スキーマ設計、テストフレームワーク構築。
- **Anthropic Claude**: システム機能結合、境界条件監査、全量スモークテスト検証。
