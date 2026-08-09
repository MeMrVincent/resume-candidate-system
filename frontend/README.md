# vue3-webpack5-js-ts-ton-connect

🌍 English | [简体中文](README.ZH.md) | [日本語](README.JA.md)

> **Author**: Vincent  
> **Version**: V2

## Description

This is a developer-friendly template demo for Vue 3 + Webpack 5. The project uses JavaScript for business code and supports TypeScript parsing for full typings.

This template includes:

- **Telegram (TG) App Integration**: Complete Ton Connect / Ton Chain wallet flow.
- **Line App Integration**: Complete Reown AppKit / EVM wallet flow.
- **Multitasking & Multi-environment Build System**: Configurable development and production parameters per platform.
- **Async Language Pack Loading**: Smooth translation transitions.
- **Separate Build Entries**: Decoupled compilation paths for `tgApp` and `lineApp`.

---

## Technical Enhancements & Security Hardening

1. **On-Chain Transaction Block Confirmations**:
   - In [wallet.line.vue](public/pages/wallet/wallet.line.vue), the EVM USDT transfer flow now uses `await res.wait()` to wait for 1 block confirmation.
   - Successful toast notifications are only prompted when `receipt.status === 1`, eliminating early confirmation mismatches.
2. **Synchronized Wallet Disconnection States**:
   - When disconnecting the EVM wallet, the project now actively purges the Pinia store state (`userStore.setUserInfo({ wallet_address: null })`) and clears the local `walletInfo` reactive object.
   - This ensures the UI instantly reflects the disconnected status and erases old address residuals.
3. **v-html XSS Sandboxing**:
   - In [index.vue](public/pages/json/index.vue) (rendering remote parameter configurations), a lightweight `sanitize` helper function has been introduced to intercept dynamic script blocks (`<script>`) and arbitrary event listener handles (like `onload`, `onclick`).
   - Restores essential style tags (e.g. `<b>`, `<i>`) while mitigating potential XSS injection vectors.
4. **Web3 Dependency Optimization & Dynamic splitChunks**:
   - The Webpack production bundler config [builder.js](build/builder.js) has been refactored to use `chunks: 'all'` splitting mechanism.
   - Massive Web3 modules are decoupled into 3 separate async cache groups:
     - `chunk-reown`: Extracts `@reown/appkit` and UI connectors.
     - `chunk-ethers-viem`: Extracts `ethers`, `viem`, and `wagmi` libraries.
     - `chunk-ton`: Extracts TON chain dependency packages `@ton` and `@tonconnect`.
   - **Performance Boost**: The original **1.76 MiB** huge async chunk warning has been resolved. With `CompressionWebpackPlugin` Gzip compression, actual payload sizes drop by over 75%, making Webview launch speeds extremely premium.

---

## Core Dependencies

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

## Install

```bash
npm install
```

## TG Start Command (Ton Connect)

```bash
npm run dev-tgApp
```

## TG Build Command

```bash
npm run build-tgApp-test
npm run build-tgApp-uat
npm run build-tgApp-prod
```

## Line Start Command (EVM and Reown)

```bash
npm run dev-lineApp
```

## Line Build Command

```bash
npm run build-lineApp-test
npm run build-lineApp-uat
npm run build-lineApp-prod
```
