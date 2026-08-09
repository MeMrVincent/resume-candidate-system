<template>
  <div class="position-page">
    <el-card shadow="never" class="header-card">
      <div class="card-header">
        <h2>职位管理中心</h2>
        <el-button type="primary" :icon="Plus">新建招聘职位</el-button>
      </div>
    </el-card>

    <el-row :gutter="16" class="mt-4">
      <el-col v-for="pos in positionList" :key="pos.id" :span="8">
        <el-card shadow="hover" class="position-card">
          <div class="pos-header">
            <h3>{{ pos.title }}</h3>
            <el-tag type="success" size="small">{{ pos.status }}</el-tag>
          </div>
          <p class="company-name"><el-icon><OfficeBuilding /></el-icon> {{ pos.company }}</p>
          <div class="pos-tags">
            <el-tag size="small" type="info">{{ pos.city }}</el-tag>
            <el-tag size="small" type="warning">{{ pos.salary }}</el-tag>
            <el-tag size="small" type="primary">招 {{ pos.headcount }} 人</el-tag>
          </div>
          <div class="pos-footer">
            <span>自动评分匹配候选人: <strong>{{ pos.matchCount }}</strong> 人</span>
            <el-button type="primary" link size="small">查看匹配</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Plus, OfficeBuilding } from '@element-plus/icons-vue';

const positionList = ref([
  { id: 1, title: '高级日企业务总监', company: '某知名跨国日企', city: '上海市', salary: '45k-60k', headcount: 1, status: '招聘中', matchCount: 18 },
  { id: 2, title: 'Java 架构师', company: '某科技独角兽', city: '北京市', salary: '35k-50k', headcount: 2, status: '招聘中', matchCount: 32 },
  { id: 3, title: '高级产品经理', company: '某互联网巨头', city: '深圳市', salary: '30k-45k', headcount: 1, status: '招聘中', matchCount: 24 },
]);
</script>

<style scoped lang="less">
.position-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    h2 { margin: 0; font-size: 20px; color: #1e293b; }
  }
  .mt-4 { margin-top: 16px; }
  .position-card {
    border-radius: 10px;
    margin-bottom: 16px;
    .pos-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 { margin: 0; font-size: 16px; color: #0f172a; }
    }
    .company-name {
      margin: 8px 0;
      font-size: 13px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pos-tags {
      display: flex;
      gap: 6px;
      margin: 12px 0;
    }
    .pos-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #475569;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
      strong { color: #0284c7; font-size: 14px; }
    }
  }
}
</style>
