<template>
  <el-container class="AppLayout">
    <el-aside :width="isMenuCollapsed ? '64px' : '220px'" class="layoutAside">
      <div class="brandLogo">
        <el-icon class="logoIcon"><Avatar /></el-icon>
        <span v-if="!isMenuCollapsed" class="brandTitle">{{ proxy.$t("menu.systemName") }}</span>
      </div>
      <el-menu :default-active="activeMenuPath" :collapse="isMenuCollapsed" background-color="#1e293b" text-color="#94a3b8" active-text-color="#38bdf8" router>
        <el-menu-item index="/company">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>{{ proxy.$t("menu.company") }}</template>
        </el-menu-item>
        <el-menu-item index="/candidate/import">
          <el-icon><Upload /></el-icon>
          <template #title>{{ proxy.$t("menu.candidateImport") }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="layoutMain">
      <el-header height="60px" class="layoutHeader">
        <el-button link class="collapseButton" @click="isMenuCollapsed = !isMenuCollapsed">
          <el-icon :size="20"><Expand v-if="isMenuCollapsed" /><Fold v-else /></el-icon>
        </el-button>
        <el-select :model-value="currentLocaleCode" class="languageSelect" @change="handleLocaleChange">
          <el-option v-for="locale in SUPPORTED_LOCALES" :key="locale.code" :label="locale.label" :value="locale.code" />
        </el-select>
      </el-header>
      <el-main class="layoutContent">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, getCurrentInstance } from "vue";
import { useRoute } from "vue-router";
import i18n, { SUPPORTED_LOCALES, switchLocale } from "@/i18n";

const { proxy } = getCurrentInstance();
const route = useRoute();
const isMenuCollapsed = ref(false);
const currentLocaleCode = computed(() => i18n.global.locale.value);
/**
 * 详情页等子路径也高亮到所属菜单：/company/3 -> /company
 * Sub-paths such as detail pages also highlight their parent menu: /company/3 -> /company
 * 詳細ページなどのサブパスも所属メニューをハイライトする：/company/3 -> /company
 */
const activeMenuPath = computed(() => (route.path.startsWith("/candidate/import") ? "/candidate/import" : "/" + route.path.split("/")[1]));

/**
 * 切换语言：异步加载新语言包，加载完成后生效
 * Switches language: asynchronously loads the new language pack and applies it once loaded
 * 言語を切り替える：新しい言語パックを非同期で読み込み、完了後に反映する
 */
const handleLocaleChange = async targetLocaleCode => {
  await switchLocale(targetLocaleCode);
};
</script>

<style scoped lang="less">
.AppLayout {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #f1f5f9;

  .layoutAside {
    background-color: #1e293b;
    transition: width 0.3s ease;

    .brandLogo {
      height: 60px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      color: #f8fafc;
      border-bottom: 1px solid #334155;

      .logoIcon {
        font-size: 24px;
        color: #38bdf8;
        margin-right: 12px;
      }
      .brandTitle {
        font-size: 16px;
        font-weight: 600;
        white-space: nowrap;
      }
    }
    .el-menu {
      border-right: none;
    }
  }

  .layoutMain {
    height: 100vh;
    overflow: hidden;

    .layoutHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #fff;
      border-bottom: 1px solid #e2e8f0;
      padding: 0 20px;

      .languageSelect {
        width: 130px;
      }
    }
    .layoutContent {
      padding: 20px;
      overflow-y: auto;
    }
  }
}
</style>
