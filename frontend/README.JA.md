# vue3-webpack5-js-ts-ton-connect

[English](README.md) | [简体中文](README.ZH.md) | 日本語

> **著者 (Author)**: Vincent  
> **バージョン (Version)**: V2

## プロジェクト概要

本プロジェクトは、Vue 3 + Webpack 5 をベースにした DApp の開発用テンプレートおよびボイラープレートです。ロジック部分は JavaScript で実装されており、TypeScript による型定義および自動コード補完をフルサポートしています。

本テンプレートの特徴：

- **Telegram (TG) アプリ連携**：TON チェーンに対応した Ton Connect 認証と USDT 送金フローを実装。
- **Line アプリ連携**：Reown AppKit に対応した EVM チェーンへの接続および送金フローを実装。
- **マルチプラットフォーム・マルチ環境ビルドシステム**：開発環境と本番環境で、TG アプリと Line アプリごとに独立したパラメータおよびビルド設定を提供。
- **言語パック非同期ロード機能（i18n）**：多言語の動的なシームレス切り替えをサポート。
- **ビルドパスの完全分離**：`tgApp` と `lineApp` のビルド設定が分離されており、相互干渉なく独立して動作。

---

## 技術的な機能向上とセキュリティ強化特性

1. **オンチェーンブロック確認の同期化**：
   - [wallet.line.vue](public/pages/wallet/wallet.line.vue) では、EVM USDT の送金リクエスト送信後、`await res.wait()` を追加して 1 ブロックのオンチェーン書き込みを強制的に待機します。
   - トランザクションレシートが返され、ステータスが `receipt.status === 1`（成功）であることを確認した後にのみ画面上で成功通知を表示するため、ネットワークの遅延などによる誤報を完全に排除します。
2. **ウォレット切断時のステータス完全リセット**：
   - EVM 環境でウォレットの接続を手動で切断した際、Pinia ストア内のグローバル接続キャッシュ（`userStore.setUserInfo({ wallet_address: null })`）およびコンポーネント内の状態オブジェクトを同時に破棄します。
   - これにより、フロントエンド UI が即座に変更を反映し、古いアドレスの残存を防ぐことで、スムーズなユーザー体験を提供します。
3. **v-html に対する XSS セキュリティサンドボックスフィルタ**：
   - 管理画面やドキュメントを表示する [index.vue](public/pages/json/index.vue) において、リモートサーバーから取得した HTML データを安全にレンダリングするため、軽量な `sanitize` ヘルパーを導入しました。
   - 動的なスクリプトブロック（`<script>` タグなど）や任意の DOM イベントリスナー（`onload` や `onclick` など）を正規表現で自動的に検知・無効化し、安全なスタイル定義（`<b>` や `<i>` などの装飾タグ）のみをレンダリングします。
4. **Web3 重大モジュールの高精度な動的分割（splitChunks）**：
   - Webpack 本番ビルド設定ファイル [builder.js](build/builder.js) において、`splitChunks` を非同期ロードにも対応させました（`chunks: 'all'`）。
   - 容量が大きく更新頻度の低い Web3 モジュールを以下の 3 つのキャッシュグループに分割し、ブラウザの長期強キャッシュ（Strong Caching）を適用させます：
     - `chunk-reown`：`@reown/appkit` および関連する接続 UI モジュール。
     - `chunk-ethers-viem`：EVM 系の主要ライブラリ `ethers`、`viem`、`wagmi`。
     - `chunk-ton`：TON チェーン専用の主要モジュール `@ton`、`@tonconnect`。
   - **パフォーマンス向上**：従来の非同期読み込み時に発生していた **1.76 MiB** の警告を完全に解消しました。さらに `CompressionWebpackPlugin`（Gzip 圧縮プラグイン）との組み合わせにより、ネットワーク転送量を 75% 以上削減し、WebView 上での初回描画速度を極限まで引き上げました。

---

## 主要依存パッケージ

```json
{
  "vue": "^3.5.27",
  "vue-router": "^4.6.4",
  "vue-i18n": "^11.2.8",
  "webpack": "^5.104.1",
  "eslint": "^8.56.0",
  "@babel/core": "^7.29.0",
  "@reown/appkit": "^1.7.8",
  "@reown/appkit-adapter-ethers": "^1.8.17",
  "@reown/appkit-adapter-wagmi": "^1.8.17",
  "@tonconnect/sdk": "^3.1.0",
  "@tonconnect/ui": "^2.4.0",
  "ethers": "^6.16.0",
  "viem": "^2.45.1",
  "wagmi": "^2.19.5"
}
```

## パッケージインストール

```bash
npm install
```

## Telegram 実行・ビルドコマンド (TON 側)

### ローカル起動
```bash
npm run dev-tgApp
```

### テスト環境ビルド
```bash
npm run build-tgApp-test
```

### UAT環境ビルド
```bash
npm run build-tgApp-uat
```

### 本番環境ビルド
```bash
npm run build-tgApp-prod
```

---

## Line NEXT 実行・ビルドコマンド (EVM 側)

### ローカル起動
```bash
npm run dev-lineApp
```

### テスト環境ビルド
```bash
npm run build-lineApp-test
```

### UAT環境ビルド
```bash
npm run build-lineApp-uat
```

### 本番环境ビルド
```bash
npm run build-lineApp-prod
```
