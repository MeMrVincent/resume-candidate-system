import { createI18n } from "vue-i18n";
import { ref } from "vue";

/**
 * 多语言（按需异步加载，不会一上来加载全部语言包）
 * Multilingual support (loaded on demand, never all language packs up front)
 * 多言語対応（必要に応じて非同期ロードし、最初にすべての言語パックを読み込むことはしない）
 *
 * 目录：locales/<语言>/core.json 为“系统必需包”（菜单、按钮、错误码等，启动时只加载当前语言的这一个包）；
 * locales/<语言>/<模块>.json 为模块包（如 company.json），进入对应页面时才加载（见 router 的 meta.i18nPacks）。
 * 切换语言：只加载新语言“已经用到过”的那些包，加载完成后再切换，页面不会闪出翻译键。
 * 每个包的顶层 key 即命名空间，如 company.json 的内容为 { "company": { ... } }，页面用 $t("company.xxx")。
 * Layout: locales/<lang>/core.json is the "required system pack" (menus, buttons, error codes ...); only this one pack of the current language is loaded at startup.
 *       locales/<lang>/<module>.json are module packs (e.g. company.json), loaded only when the matching page is entered (see meta.i18nPacks in the router).
 * Switching language: only the packs the user has already used are loaded for the new language, and the switch happens after loading, so no translation keys flash on the page.
 * The top-level key of each pack is its namespace, e.g. company.json contains { "company": { ... } } and pages use $t("company.xxx").
 * 構成：locales/<言語>/core.json は「システム必須パック」（メニュー、ボタン、エラーコードなど）で、起動時は現在の言語のこの 1 つだけを読み込む。
 *       locales/<言語>/<モジュール>.json はモジュールパック（例：company.json）で、該当ページに入ったときに初めて読み込む（router の meta.i18nPacks を参照）。
 * 言語切替：新しい言語について「すでに使ったことのあるパック」だけを読み込み、読み込み完了後に切り替えるため、翻訳キーが一瞬表示されることはない。
 * 各パックの最上位キーが名前空間になる。例：company.json の中身は { "company": { ... } } で、ページでは $t("company.xxx") を使う。
 */
export const SUPPORTED_LOCALES = [
  { code: "en-us", label: "English", elementPlusLocaleName: "en" },
  { code: "zh-cn", label: "简体中文", elementPlusLocaleName: "zh-cn" },
  { code: "ja-jp", label: "日本語", elementPlusLocaleName: "ja" }
];
const DEFAULT_LOCALE_CODE = "en-us";
const CORE_PACK_NAME = "core";
const LOCALE_STORAGE_KEY = "language";

const i18n = createI18n({
  globalInjection: true,
  legacy: false,
  locale: DEFAULT_LOCALE_CODE,
  fallbackLocale: DEFAULT_LOCALE_CODE,
  messages: {}
});

/**
 * Element Plus 组件自带文案的语言对象，由 App.vue 的 el-config-provider 使用
 * Language object for the built-in texts of Element Plus components, used by el-config-provider in App.vue
 * Element Plus コンポーネント組み込み文言の言語オブジェクト。App.vue の el-config-provider が使う
 */
export const elementPlusLocale = ref(null);

/**
 * 已加载的包，格式 "语言/包名"
 * Packs already loaded, in the form "language/pack name"
 * 読み込み済みのパック。形式は「言語/パック名」
 */
const loadedPackKeys = new Set();
/**
 * 用户进入过的模块包名；切换语言时据此决定要加载哪些包
 * Names of module packs the user has visited; used to decide which packs to load when switching language
 * ユーザーが訪れたモジュールパック名。言語切替時にどのパックを読み込むかの判断に使う
 */
const visitedModulePackNames = new Set();

/**
 * 读取用户的语言：先看本地保存，其次看浏览器语言，最后用默认语言
 * Detects the user's language: saved setting first, then the browser language, finally the default language
 * ユーザーの言語を判定する：保存済みの設定、次にブラウザの言語、最後に既定の言語
 */
export function detectInitialLocaleCode() {
  const supportedCodes = SUPPORTED_LOCALES.map(locale => locale.code);
  let savedCode = null;
  try {
    savedCode = localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch (error) {
    savedCode = null;
  }
  if (supportedCodes.includes(savedCode)) return savedCode;

  const browserLanguage = (navigator.language || "").toLowerCase();
  const matchedLocale = SUPPORTED_LOCALES.find(locale => browserLanguage.startsWith(locale.code.split("-")[0]));
  return matchedLocale ? matchedLocale.code : DEFAULT_LOCALE_CODE;
}

/**
 * 加载某语言的某个包（已加载则跳过）。webpack 会把每个 json 拆成独立 chunk，用到才下载
 * Loads one pack of one language (skipped if already loaded). webpack splits every json into its own chunk, downloaded only when used
 * ある言語の 1 つのパックを読み込む（読み込み済みならスキップ）。webpack は各 json を独立したチャンクに分割し、使うときだけダウンロードする
 */
async function loadLocalePack(localeCode, packName) {
  const packKey = `${localeCode}/${packName}`;
  if (loadedPackKeys.has(packKey)) return;
  const packModule = await import(/* webpackChunkName: "i18n-[request]" */ `./locales/${localeCode}/${packName}.json`);
  i18n.global.mergeLocaleMessage(localeCode, packModule.default || packModule);
  loadedPackKeys.add(packKey);
}

/**
 * 加载 Element Plus 的对应语言（同样按需）
 * Loads the matching Element Plus language (also on demand)
 * 対応する Element Plus の言語を読み込む（同じくオンデマンド）
 */
async function loadElementPlusLocale(localeCode) {
  if (localeCode === "zh-cn") {
    const mod = await import(
      /* webpackChunkName: "el-locale-zh" */ "element-plus/es/locale/lang/zh-cn"
    );
    elementPlusLocale.value = mod.default;
  } else if (localeCode === "ja-jp") {
    const mod = await import(
      /* webpackChunkName: "el-locale-ja" */ "element-plus/es/locale/lang/ja"
    );
    elementPlusLocale.value = mod.default;
  } else {
    const mod = await import(
      /* webpackChunkName: "el-locale-en" */ "element-plus/es/locale/lang/en"
    );
    elementPlusLocale.value = mod.default;
  }
}

/**
 * 页面进入前调用：确保当前语言的这些模块包已加载（路由守卫使用）
 * Called before entering a page: makes sure these module packs of the current language are loaded (used by the router guard)
 * ページに入る前に呼ぶ：現在の言語のこれらのモジュールパックが読み込み済みであることを保証する（ルーターガードが使用）
 */
export async function ensureModulePacksLoaded(packNames = []) {
  const currentLocaleCode = i18n.global.locale.value;
  for (const packName of packNames) visitedModulePackNames.add(packName);
  await Promise.all(packNames.map(packName => loadLocalePack(currentLocaleCode, packName)));
}

/**
 * 应用启动时调用：只加载当前语言的系统必需包 + Element Plus 语言
 * Called at application start: loads only the required system pack of the current language plus the Element Plus language
 * アプリ起動時に呼ぶ：現在の言語のシステム必須パックと Element Plus の言語だけを読み込む
 */
export async function setupI18n() {
  const initialLocaleCode = detectInitialLocaleCode();
  await Promise.all([loadLocalePack(initialLocaleCode, CORE_PACK_NAME), loadElementPlusLocale(initialLocaleCode)]);
  i18n.global.locale.value = initialLocaleCode;
  document.documentElement.lang = initialLocaleCode;
}

/**
 * 切换语言：先异步加载新语言所需的包，加载完再生效
 * Switches language: first asynchronously loads the packs needed by the new language, and applies it once loading is done
 * 言語を切り替える：新しい言語に必要なパックを先に非同期で読み込み、完了してから反映する
 */
export async function switchLocale(targetLocaleCode) {
  const neededPackNames = [CORE_PACK_NAME, ...visitedModulePackNames];
  await Promise.all([
    ...neededPackNames.map(packName => loadLocalePack(targetLocaleCode, packName)),
    loadElementPlusLocale(targetLocaleCode)
  ]);
  i18n.global.locale.value = targetLocaleCode;
  document.documentElement.lang = targetLocaleCode;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, targetLocaleCode);
  } catch (error) {
    // 本地存储不可用时只是下次启动不记住语言，不影响使用
    // If local storage is unavailable, the language is just not remembered at the next start; usage is not affected
    // ローカルストレージが使えない場合は次回起動時に言語を記憶しないだけで、利用には影響しない
  }
}

export default i18n;
