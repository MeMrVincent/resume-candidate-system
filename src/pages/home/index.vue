<template>
  <section class="home-container">
    <el-card class="welcome-card">
      <template #header>
        <div class="card-header">
          <h2>猎头招聘管理系统</h2>
          <el-tag type="success" effect="dark">Vue 3 + Webpack 5</el-tag>
        </div>
      </template>
      <div class="card-body">
        <p>系统已初始化完成单应用模式框架。</p>
        <div class="action-list">
          <el-button type="primary" size="large" @click="handleAction('candidate')">
            候选人管理
          </el-button>
          <el-button type="success" size="large" @click="handleAction('position')">
            职位管理
          </el-button>
          <el-button type="warning" size="large" @click="handleAction('customer')">
            客户公司管理
          </el-button>
        </div>
      </div>
    </el-card>
  </section>
</template>

<script setup>
import { ElMessage } from 'element-plus';

const handleAction = (type) => {
  ElMessage.info(`跳转至 ${type} 模块（开发中）`);
};
</script>

<style scoped lang="less">
.home-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f7fa;

  .welcome-card {
    width: 600px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h2 {
        margin: 0;
        color: #303133;
      }
    }

    .card-body {
      p {
        color: #606266;
        font-size: 14px;
        margin-bottom: 24px;
      }

      .action-list {
        display: flex;
        gap: 16px;
      }
    }
  }
}
</style>
