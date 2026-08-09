<template>
  <div class="dashboard-page">
    <!-- 欢迎 Banner -->
    <div class="welcome-banner">
      <div class="banner-text">
        <h1>欢迎使用猎头 CRM / ATS 招聘管理系统</h1>
        <p>基于 Electron + Vue 3 + SQLite 的本地桌面端极速招聘管理系统。</p>
      </div>
      <el-button type="primary" size="large" @click="goToCandidate">
        立刻检索人才库 ({{ candidateStore.databaseTotalCount.toLocaleString() }} 份简历)
      </el-button>
    </div>

    <!-- 业务核心指标卡片 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <span class="stat-number color-blue">{{ candidateStore.databaseTotalCount.toLocaleString() }}</span>
            <span class="stat-title">人才库总候选人</span>
          </div>
          <el-icon class="stat-icon color-blue"><UserFilled /></el-icon>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <span class="stat-number color-emerald">12</span>
            <span class="stat-title">正在招聘的职位</span>
          </div>
          <el-icon class="stat-icon color-emerald"><Briefcase /></el-icon>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <span class="stat-number color-purple">8</span>
            <span class="stat-title">合作客户公司</span>
          </div>
          <el-icon class="stat-icon color-purple"><OfficeBuilding /></el-icon>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <span class="stat-number color-amber">35</span>
            <span class="stat-title">本周推荐候选人</span>
          </div>
          <el-icon class="stat-icon color-amber"><TrendCharts /></el-icon>
        </el-card>
      </el-col>
    </el-row>

    <!-- 下方快速访问板块 -->
    <el-row :gutter="20" class="content-row">
      <el-col :span="14">
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="card-header">
              <span>系统架构与领域闭环</span>
              <el-tag type="success">WAL 极速模式</el-tag>
            </div>
          </template>
          <div class="workflow-info">
            <div class="workflow-step">
              <div class="step-num">1</div>
              <div class="step-desc">
                <h4>人才数据结构化落盘</h4>
                <p>9,860 份简历成功解析落库，包含全套工作履历、教育经历及多语言快照。</p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-num">2</div>
              <div class="step-desc">
                <h4>Full-Text raw_text 全文检索引擎</h4>
                <p>组合 FTS5 全文搜索与结构化条件快速召回精准候选人。</p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-num">3</div>
              <div class="step-desc">
                <h4>PositionCandidateMatch 推进闭环</h4>
                <p>系统自动推荐/人工判定匹配度，推进沟通、推客户、面试、Offer 与入职。</p>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="card-header">
              <span>快捷系统指令</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" size="large" class="action-btn" @click="goToCandidate">
              <el-icon><Search /></el-icon> 进入人才库检索
            </el-button>
            <el-button type="success" size="large" class="action-btn" @click="goToPosition">
              <el-icon><Plus /></el-icon> 创建新招聘职位
            </el-button>
            <el-button type="warning" size="large" class="action-btn" @click="goToCustomer">
              <el-icon><OfficeBuilding /></el-icon> 管理客户公司
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCandidateStore } from '@/stores/candidateStore';
import {
  UserFilled,
  Briefcase,
  OfficeBuilding,
  TrendCharts,
  Search,
  Plus,
} from '@element-plus/icons-vue';

const router = useRouter();
const candidateStore = useCandidateStore();

const goToCandidate = () => router.push('/candidate');
const goToPosition = () => router.push('/position');
const goToCustomer = () => router.push('/customer');

onMounted(() => {
  candidateStore.fetchDatabaseTotalCount();
});
</script>

<style scoped lang="less">
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 20px;

  .welcome-banner {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #ffffff;
    border-radius: 14px;
    padding: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.15);

    .banner-text {
      h1 {
        margin: 0 0 10px;
        font-size: 24px;
        font-weight: 700;
      }
      p {
        margin: 0;
        color: #94a3b8;
        font-size: 14px;
      }
    }
  }

  .stat-row {
    .stat-card {
      border-radius: 12px;

      :deep(.el-card__body) {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
      }

      .stat-content {
        display: flex;
        flex-direction: column;

        .stat-number {
          font-size: 28px;
          font-weight: 700;
        }

        .stat-title {
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
        }
      }

      .stat-icon {
        font-size: 36px;
      }

      .color-blue { color: #0284c7; }
      .color-emerald { color: #10b981; }
      .color-purple { color: #8b5cf6; }
      .color-amber { color: #f59e0b; }
    }
  }

  .content-row {
    .section-card {
      border-radius: 12px;
      height: 100%;

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: #1e293b;
      }

      .workflow-info {
        display: flex;
        flex-direction: column;
        gap: 16px;

        .workflow-step {
          display: flex;
          gap: 14px;
          align-items: flex-start;

          .step-num {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #0284c7;
            color: #ffffff;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .step-desc {
            h4 {
              margin: 0 0 4px;
              color: #1e293b;
            }
            p {
              margin: 0;
              font-size: 13px;
              color: #64748b;
            }
          }
        }
      }

      .quick-actions {
        display: flex;
        flex-direction: column;
        gap: 14px;

        .action-btn {
          height: 48px;
          font-size: 15px;
          border-radius: 8px;
        }
      }
    }
  }
}
</style>
