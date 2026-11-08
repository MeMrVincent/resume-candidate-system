<template>
  <el-container class="app-layout">
    <!-- 左侧侧边栏导航 / EN: Left sidebar navigation / JA: 左側サイドバーナビゲーション -->
    <el-aside :width="isCollapse ? '64px' : '230px'" class="layout-aside">
      <div class="brand-logo">
        <el-icon class="logo-icon"><Avatar /></el-icon>
        <span v-if="!isCollapse" class="brand-title">{{ $t('layout.brandTitle') }}</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        class="layout-menu"
        :collapse="isCollapse"
        background-color="#1e293b"
        text-color="#94a3b8"
        active-text-color="#38bdf8"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>{{ $t('layout.dashboard') }}</template>
        </el-menu-item>

        <el-menu-item index="/candidate">
          <el-icon><User /></el-icon>
          <template #title>{{ $t('layout.candidates') }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主体区域 / EN: Main content container / JA: メインエリア -->
    <el-container class="layout-main-container">
      <!-- 顶部 Header / EN: Top header / JA: 上部ヘッダー -->
      <el-header height="60px" class="layout-header">
        <div class="header-left">
          <el-button
            type="text"
            class="toggle-btn"
            @click="isCollapse = !isCollapse"
          >
            <el-icon :size="20">
              <Expand v-if="isCollapse" />
              <Fold v-else />
            </el-icon>
          </el-button>

          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">{{ $t('layout.home') }}</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentRouteTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-tag type="success" size="small" class="db-status-tag" effect="dark">
            <span class="status-dot"></span> {{ $t('layout.dbOnline') }}
          </el-tag>

          <!-- 语言切换 / EN: Language switcher / JA: 言語切り替え -->
          <el-dropdown trigger="click" @command="handleLanguageChange">
            <el-button size="small" class="lang-switch-btn">
              <el-icon style="margin-right: 4px"><Operation /></el-icon>
              {{ currentLangLabel }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="en" :disabled="locale === 'en'">{{ $t('layout.langEn') }}</el-dropdown-item>
                <el-dropdown-item command="zh-cn" :disabled="locale === 'zh-cn'">{{ $t('layout.langZh') }}</el-dropdown-item>
                <el-dropdown-item command="ja" :disabled="locale === 'ja'">{{ $t('layout.langJa') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <div class="user-profile">
            <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            <span class="username">{{ $t('layout.userRole') }}</span>
          </div>
        </div>
      </el-header>

      <!-- 页面内容视图 / EN: Router view content / JA: ページコンテンツ表示エリア -->
      <el-main class="layout-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  Avatar,
  DataAnalysis,
  User,
  Expand,
  Fold,
  Operation,
  ArrowDown
} from '@element-plus/icons-vue';

const { locale, t } = useI18n();
const isCollapse = ref(false);
const route = useRoute();

const activeMenu = computed(() => route.path);

const currentRouteTitle = computed(() => {
  switch (route.path) {
    case '/dashboard':
      return t('layout.dashboard');
    case '/candidate':
      return t('layout.candidates');
    default:
      return t('layout.candidates');
  }
});

const currentLangLabel = computed(() => {
  switch (locale.value) {
    case 'zh-cn':
      return t('layout.langZh');
    case 'ja':
      return t('layout.langJa');
    case 'en':
    default:
      return t('layout.langEn');
  }
});

const handleLanguageChange = (lang) => {
  locale.value = lang;
  localStorage.setItem('language', lang);
};
</script>

<style scoped lang="less">
.app-layout {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #f8fafc;

  .layout-aside {
    background-color: #1e293b;
    transition: width 0.3s ease;
    display: flex;
    flex-direction: column;
    z-index: 10;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);

    .brand-logo {
      height: 60px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      color: #f8fafc;
      border-bottom: 1px solid #334155;

      .logo-icon {
        font-size: 24px;
        color: #38bdf8;
        margin-right: 12px;
      }

      .brand-title {
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }
    }

    .layout-menu {
      border-right: none;
      flex: 1;
      margin-top: 8px;
    }
  }

  .layout-main-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;

    .layout-header {
      background-color: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;

        .toggle-btn {
          color: #64748b;
          font-size: 18px;
          &:hover {
            color: #0284c7;
          }
        }
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 16px;

        .db-status-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;

          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #4ade80;
            display: inline-block;
            box-shadow: 0 0 6px #4ade80;
          }
        }

        .lang-switch-btn {
          display: flex;
          align-items: center;
          border-radius: 6px;
          padding: 6px 10px;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;

          .username {
            font-size: 14px;
            font-weight: 500;
            color: #334155;
          }
        }
      }
    }

    .layout-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      background-color: #f1f5f9;
    }
  }
}

/* 页面切换平滑淡入动画 / EN: Smooth fade-in animation for view transitions / JA: ページ遷移のフェードインアニメーション */
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
