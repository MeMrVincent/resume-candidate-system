<template>
  <el-container class="app-layout">
    <!-- 左侧侧边栏导航 -->
    <el-aside :width="isCollapse ? '64px' : '230px'" class="layout-aside">
      <div class="brand-logo">
        <el-icon class="logo-icon"><Avatar /></el-icon>
        <span v-if="!isCollapse" class="brand-title">猎头 CRM / ATS</span>
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
          <template #title>仪表盘</template>
        </el-menu-item>

        <el-menu-item index="/candidate">
          <el-icon><User /></el-icon>
          <template #title>人才库管理</template>
        </el-menu-item>

        <el-menu-item index="/position">
          <el-icon><Briefcase /></el-icon>
          <template #title>职位管理</template>
        </el-menu-item>

        <el-menu-item index="/customer">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>客户公司</template>
        </el-menu-item>

        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <template #title>系统设置</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主体区域 -->
    <el-container class="layout-main-container">
      <!-- 顶部 Header -->
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
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentRouteTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-tag type="success" size="small" class="db-status-tag" effect="dark">
            <span class="status-dot"></span> SQLite 本地库在线
          </el-tag>
          <div class="user-profile">
            <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            <span class="username">资深顾问</span>
          </div>
        </div>
      </el-header>

      <!-- 页面内容视图 -->
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
import {
  Avatar,
  DataAnalysis,
  User,
  Briefcase,
  OfficeBuilding,
  Setting,
  Expand,
  Fold,
} from '@element-plus/icons-vue';

const isCollapse = ref(false);
const route = useRoute();

const activeMenu = computed(() => route.path);

const currentRouteTitle = computed(() => {
  switch (route.path) {
    case '/dashboard':
      return '概览仪表盘';
    case '/candidate':
      return '人才库管理';
    case '/position':
      return '职位管理';
    case '/customer':
      return '客户公司管理';
    case '/settings':
      return '系统设置';
    default:
      return '人才库';
  }
});
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

/* 页面切换平滑淡入动画 */
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
