# vue3-webpack5-js-ts-ton-connect

[English](README.md) | 简体中文 | [日本語](README.JA.md)

> **作者 (Author)**: Vincent  
> **版本 (Version)**: V2

## 项目简介

本项目是一个基于 Vue 3 + Webpack 5 的 DApp 脚手架与集成模版。项目业务代码采用 JavaScript 编写，同时支持 TypeScript 类型解析以提供完整的代码提示。

本模版包含：

- **Telegram (TG) 应用集成**：支持完整的 Ton Connect / TON 链钱包连接及 USDT 交易流程。
- **Line 应用集成**：支持完整的 Reown AppKit / EVM 钱包连接及以太坊网络交易流程。
- **多平台与多环境构建系统**：针对不同平台（TG / Line）定制独立的开发调试参数及生产打包配置。
- **语言包异步加载机制**：支持国际化多语言（i18n）动态无缝切换。
- **独立编译入口**：`tgApp` 与 `lineApp` 编译路径彻底解耦，互不干扰。

---

## 技术优化与安全加固特性 @ 2026/06/30

本项目从生产级优化项目 `F:\openad\git-openad-saas-bms-v1` 中单独拆分而来，并在此基础上进行了多项针对 DApp 的安全性与工程化打包优化：

1. **EVM 链上转账区块确认**：
   - 在 [wallet.line.vue](public/pages/wallet/wallet.line.vue) 中，USDT 转账交易提交后，升级为使用 `await res.wait()` 强行等待 1 个区块的链上确认。
   - 只有在收据返回且确认状态 `receipt.status === 1` 时，前端才提示充值成功，彻底避免了交易因网络问题回滚时前端提前误报成功的缺陷。
2. **钱包状态彻底注销与同步重置**：
   - 用户在 EVM 环境中主动断开钱包连接时，系统会自动清空 Pinia 状态管理器中的全局钱包缓存（`userStore.setUserInfo({ wallet_address: null })`）并重置局部响应式对象。
   - 保证了前端 UI 能够瞬间响应并同步清除残留的钱包地址信息，提升了交互体验。
3. **v-html 跨站脚本攻击（XSS）安全过滤**：
   - 针对协议展示组件 [index.vue](public/pages/json/index.vue) 渲染远程配置的 HTML 内容，引入了轻量级 HTML 安全过滤函数 `sanitize`。
   - 该过滤机制会正则拦截并移除所有动态执行的代码块（如 `<script>` 标签）和任意内嵌 DOM 监听事件（如 `onload`、`onclick` 等），仅安全保留无害的样式排版标签（如 `<b>`、`<i>` 等）。
4. **Web3 庞大依赖包的精细化动态分包**：
   - 重构了 Webpack 生产构建配置文件 [builder.js](build/builder.js) 的 `splitChunks` 配置，将分包深度由同步首屏拦截扩展为全异步拦截（`chunks: 'all'`）。
   - 将体积庞大且不常变动的 Web3 模块彻底拆分为 3 大缓存组，从而可以独立生成长效强缓存：
     - `chunk-reown`：提取 `@reown/appkit` 钱包 UI 连接器。
     - `chunk-ethers-viem`：提取以太坊及 EVM 基础驱动库 `ethers`、`viem`、`wagmi`。
     - `chunk-ton`：提取 TON 链专属底层依赖包 `@ton`、`@tonconnect`。
   - **优化效果**：原本 1.76 MiB 的巨大异步打包体量警告已被彻底消除。再配合 Webpack 自带的 `CompressionWebpackPlugin`（Gzip 预压缩插件），实际的网络传输体量骤降 75% 以上，WebView 页面加载速度获得极速提升。

---

## 核心依赖包

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

## 安装依赖

```bash
npm install
```

## Telegram 运行与打包指令 (TON 链端)

### 本地开发调试
```bash
npm run dev-tgApp
```

### 构建测试环境部署包
```bash
npm run build-tgApp-test
```

### 构建 UAT 环境部署包
```bash
npm run build-tgApp-uat
```

### 构建正式生产环境部署包
```bash
npm run build-tgApp-prod
```

---

## Line NEXT 运行与打包指令 (EVM 链端)

### 本地开发调试
```bash
npm run dev-lineApp
```

### 构建测试环境部署包
```bash
npm run build-lineApp-test
```

### 构建 UAT 环境部署包
```bash
npm run build-lineApp-uat
```

### 构建正式生产环境部署包
```bash
npm run build-lineApp-prod
```
