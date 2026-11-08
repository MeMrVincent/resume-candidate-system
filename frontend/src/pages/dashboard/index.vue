<template>
  <div class="dashboard-page">
    <!-- 欢迎 Banner / EN: Welcome banner / JA: ウェルカムバナー -->
    <div class="welcome-banner">
      <div class="banner-text">
        <h1>{{ $t('dashboard.welcomeTitle') }}</h1>
        <p>{{ $t('dashboard.welcomeDesc') }}</p>
      </div>
      <el-button type="primary" size="large" @click="goToCandidate">
        {{ $t('dashboard.searchNow', { count: candidateCount.toLocaleString() }) }}
      </el-button>
    </div>

    <!-- 业务核心指标卡片 / EN: Core metrics cards / JA: コア指標カードエリア -->
    <el-row :gutter="20" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <span class="stat-number color-blue">{{ candidateCount.toLocaleString() }}</span>
            <span class="stat-title">{{ $t('dashboard.totalCandidates') }}</span>
          </div>
          <el-icon class="stat-icon color-blue"><UserFilled /></el-icon>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <span class="stat-number color-emerald">--</span>
            <span class="stat-title">{{ $t('dashboard.positionsPhase2') }}</span>
          </div>
          <el-icon class="stat-icon color-emerald"><Briefcase /></el-icon>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <span class="stat-number color-purple">--</span>
            <span class="stat-title">{{ $t('dashboard.companiesPhase3') }}</span>
          </div>
          <el-icon class="stat-icon color-purple"><OfficeBuilding /></el-icon>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <span class="stat-number color-amber">--</span>
            <span class="stat-title">{{ $t('dashboard.matchingPhase2') }}</span>
          </div>
          <el-icon class="stat-icon color-amber"><TrendCharts /></el-icon>
        </el-card>
      </el-col>
    </el-row>

    <!-- 下方快速访问板块 / EN: Quick access section / JA: クイックアクセスセクション -->
    <el-row :gutter="20" class="content-row">
      <el-col :span="14">
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t('dashboard.archTitle') }}</span>
              <el-tag type="success">{{ $t('dashboard.walBadge') }}</el-tag>
            </div>
          </template>
          <div class="workflow-info">
            <div class="workflow-step">
              <div class="step-num">1</div>
              <div class="step-desc">
                <h4>{{ $t('dashboard.candidateModelTitle') }}</h4>
                <p>{{ $t('dashboard.candidateModelDesc') }}</p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-num">2</div>
              <div class="step-desc">
                <h4>{{ $t('dashboard.ftsTitle') }}</h4>
                <p>{{ $t('dashboard.ftsDesc') }}</p>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-num">3</div>
              <div class="step-desc">
                <h4>{{ $t('dashboard.pipelineTitle') }}</h4>
                <p>{{ $t('dashboard.pipelineDesc') }}</p>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t('dashboard.quickAccessTitle') }}</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" size="large" class="action-btn" @click="goToCandidate">
              <el-icon><Search /></el-icon> {{ $t('dashboard.enterSearch') }}
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { candidateApi } from '@/api/candidateApi';
import { ElMessage } from 'element-plus';
import {
  UserFilled,
  Briefcase,
  OfficeBuilding,
  TrendCharts,
  Search,
} from '@element-plus/icons-vue';

const { t } = useI18n();
const router = useRouter();
const candidateCount = ref(0);

const goToCandidate = () => router.push('/candidate');
onMounted(() => {
  candidateApi.candidatesCount()
    .then((count) => { candidateCount.value = count; })
    .catch((error) => ElMessage.error(`${t('dashboard.statsFailed')}: ${error.message}`));
});
</script>

<style scoped lang="less">
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 20px;

  .welcome-banner {
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    border-radius: 12px;
    padding: 30px;
    color: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);

    .banner-text {
      h1 {
        margin: 0 0 10px 0;
        font-size: 24px;
        font-weight: 600;
      }
      p {
        margin: 0;
        opacity: 0.9;
        font-size: 14px;
      }
    }
  }

  .stat-row {
    .stat-card {
      border-radius: 12px;
      transition: all 0.3s ease;
      cursor: pointer;

      &:hover {
        transform: translateY(-2px);
      }

      :deep(.el-card__body) {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
      }

      .stat-content {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .stat-number {
          font-size: 28px;
          font-weight: 700;
          line-height: 1;

          &.color-blue { color: #0284c7; }
          &.color-emerald { color: #10b981; }
          &.color-purple { color: #8b5cf6; }
          &.color-amber { color: #f59e0b; }
        }

        .stat-title {
          font-size: 14px;
          color: #64748b;
        }
      }

      .stat-icon {
        font-size: 38px;
        opacity: 0.85;

        &.color-blue { color: #38bdf8; }
        &.color-emerald { color: #34d399; }
        &.color-purple { color: #a78bfa; }
        &.color-amber { color: #fbbf24; }
      }
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
          align-items: flex-start;
          gap: 16px;

          .step-num {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background-color: #e0f2fe;
            color: #0284c7;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            flex-shrink: 0;
          }

          .step-desc {
            h4 {
              margin: 0 0 4px 0;
              font-size: 15px;
              color: #1e293b;
            }
            p {
              margin: 0;
              font-size: 13px;
              color: #64748b;
              line-height: 1.5;
            }
          }
        }
      }

      .quick-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .action-btn {
          width: 100%;
          justify-content: center;
          padding: 16px;
          font-size: 15px;
        }
      }
    }
  }
}
</style>
