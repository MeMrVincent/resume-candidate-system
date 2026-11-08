# 人材紹介・採用管理システム V2 - フロントエンド

> **言語ナビゲーション / Language Navigation / 语言导航**  
> [English](README.md) | [简体中文](README.ZH.md) | **日本語**

Vue 3 + Element Plus + Webpack 5 + JavaScript で構築された人材紹介・採用管理システム V2 のフロントエンドプロジェクト。

---

## 主な機能

- **最新のシングルページアプリケーション**: Vue 3 Composition API と Element Plus による直感的な UI。
- **オンデマンド多言語ローカライゼーション (i18n)**: 英語（デフォルト）、簡体字中国語、日本語に対応。必要な言語パックのみを非同期分割ロードし、Element Plus の言語設定と動的に同期。
- **モジュール化された企業 CRM および ATS 画面**:
  - クライアント企業管理、複数担当者登録、企業詳細プロファイル。
  - 候補者 JSON 一括インポーター（対話的なファイル/フォルダ選択、進捗追跡、連絡先重複アラート表示）。
- **高パフォーマンス Webpack 5 構成**: コード分割（Code Splitting）、Babel ランタイム最適化、アセット圧縮を完備。

---

## ディレクトリ構成

```text
frontend/
├── build/                 # Webpack ビルド設定 (common, dev, prod)
├── config/                # 環境設定
├── src/
│   ├── api/               # ドメイン API 呼び出しラッパー
│   ├── http/              # IPC / AJAX 通信アダプタ
│   ├── i18n/              # vue-i18n 設定およびオンデマンドローダー
│   │   └── locales/       # 分割言語パック (en-us, zh-cn, ja-jp)
│   ├── pages/             # 業務画面 (企業管理, 候補者インポーター)
│   ├── router/            # Vue Router ルーティングおよび i18n ガード
│   ├── App.vue            # ルートコンポーネント (el-config-provider 連携)
│   └── main.js            # フロントエンドエントリーポイント
├── static/                # 静的アセット (フォント, スタイルシート, 画像)
└── package.json           # 依存パッケージおよびスクリプト
```

---

## セットアップ手順

```bash
# フロントエンドディレクトリへ移動
cd frontend

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev

# 本番ビルドの実行
npm run build
```

---

## AI 開発貢献クレジット

- **Google DeepMind Antigravity**: アーキテクチャ設計、完全な i18n 多言語化、3言語技術ドキュメント策定、パッケージング構成の統合。
- **OpenAI Codex**: データ変換基盤、多言語履歴書マージ、初期スキャフォールディング。
- **Anthropic Claude**: システムテストおよび動作検証。
