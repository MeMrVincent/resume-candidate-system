<template>
  <div class="candidate-list-page">
    <!-- 顶部数据概览卡片区 -->
    <el-row :gutter="16" class="metrics-row">
      <el-col :span="6">
        <div class="metric-card bg-gradient-blue">
          <div class="metric-info">
            <span class="metric-label">人才库总量</span>
            <span class="metric-value">{{ candidateStore.databaseTotalCount.toLocaleString() }}</span>
          </div>
          <el-icon class="metric-icon"><UserFilled /></el-icon>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="metric-card bg-gradient-emerald">
          <div class="metric-info">
            <span class="metric-label">当前检索结果</span>
            <span class="metric-value">{{ candidateStore.totalCount }}</span>
          </div>
          <el-icon class="metric-icon"><Search /></el-icon>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="metric-card bg-gradient-purple">
          <div class="metric-info">
            <span class="metric-label">包含 Full-Text raw_text</span>
            <span class="metric-value">100%</span>
          </div>
          <el-icon class="metric-icon"><DocumentChecked /></el-icon>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="metric-card bg-gradient-amber">
          <div class="metric-info">
            <span class="metric-label">数据库引擎</span>
            <span class="metric-value">SQLite WAL</span>
          </div>
          <el-icon class="metric-icon"><Coin /></el-icon>
        </div>
      </el-col>
    </el-row>

    <!-- 高级搜索筛选栏 -->
    <el-card shadow="never" class="filter-card">
      <el-form :model="candidateStore.searchFilters" inline label-position="left">
        <el-form-item label="全文搜索">
          <el-input
            v-model="candidateStore.searchFilters.keyword"
            placeholder="支持关键词/经历/技能/多语言..."
            clearable
            style="width: 280px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="期望/居住城市">
          <el-select
            v-model="candidateStore.searchFilters.city"
            placeholder="选择城市"
            clearable
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option label="上海市" value="上海市" />
            <el-option label="北京市" value="北京市" />
            <el-option label="深圳市" value="深圳市" />
            <el-option label="广州市" value="广州市" />
            <el-option label="杭州市" value="杭州市" />
            <el-option label="无锡市" value="无锡市" />
          </el-select>
        </el-form-item>

        <el-form-item label="学历层次">
          <el-select
            v-model="candidateStore.searchFilters.degreeType"
            placeholder="学历"
            clearable
            style="width: 120px"
            @change="handleSearch"
          >
            <el-option label="博士" value="博士" />
            <el-option label="硕士" value="硕士" />
            <el-option label="本科" value="本科" />
            <el-option label="大专" value="大专" />
          </el-select>
        </el-form-item>

        <el-form-item label="工作年限">
          <el-input-number
            v-model="candidateStore.searchFilters.minWorkYears"
            :min="0"
            :max="40"
            placeholder="最小"
            controls-position="right"
            style="width: 100px"
          />
          <span class="range-separator">-</span>
          <el-input-number
            v-model="candidateStore.searchFilters.maxWorkYears"
            :min="0"
            :max="40"
            placeholder="最大"
            controls-position="right"
            style="width: 100px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">检索人才</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置条件</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 候选人数据表格区 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="candidateStore.loading"
        :data="candidateStore.candidateList"
        stripe
        style="width: 100%"
        row-key="id"
        @row-click="handleRowClick"
      >
        <el-table-column label="候选人姓名" min-width="140">
          <template #default="{ row }">
            <div class="name-cell">
              <span class="candidate-name">{{ row.full_name || '未命名' }}</span>
              <el-tag v-if="row.gender" size="small" :type="row.gender === '女' ? 'danger' : 'info'" effect="plain">
                {{ row.gender }} {{ row.age ? `· ${row.age}岁` : '' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="当前公司 / 职位" min-width="220">
          <template #default="{ row }">
            <div class="job-cell">
              <span class="company">{{ row.current_company || '暂无/保密' }}</span>
              <span class="position">{{ row.current_position || '-' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="city" label="城市" width="110">
          <template #default="{ row }">
            <el-tag size="small" type="success" effect="light">{{ row.city || '未知' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="highest_degree_type" label="学历" width="100">
          <template #default="{ row }">
            <span>{{ row.highest_degree_type || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="联系电话 / 邮箱" min-width="200">
          <template #default="{ row }">
            <div class="contact-cell">
              <span v-if="row.primary_phone" class="phone"><el-icon><Phone /></el-icon> {{ row.primary_phone }}</span>
              <span v-if="row.primary_email" class="email"><el-icon><Message /></el-icon> {{ row.primary_email }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="resume_updated_date" label="简历更新时间" width="170" sortable />

        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="openDetail(row.id || row.candidate_id)">
              查看画像
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 候选人画像抽屉组件 -->
    <CandidateDetailDrawer />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useCandidateStore } from '@/stores/candidateStore';
import CandidateDetailDrawer from './CandidateDetailDrawer.vue';
import {
  UserFilled,
  Search,
  DocumentChecked,
  Coin,
  Refresh,
  Phone,
  Message,
} from '@element-plus/icons-vue';

const candidateStore = useCandidateStore();

const handleSearch = () => {
  candidateStore.fetchCandidates();
};

const handleReset = () => {
  candidateStore.resetFilters();
};

const openDetail = (id) => {
  candidateStore.openCandidateDetail(id || 1);
};

const handleRowClick = (row) => {
  openDetail(row.id || row.candidate_id);
};

onMounted(() => {
  candidateStore.fetchDatabaseTotalCount();
  candidateStore.fetchCandidates();
});
</script>

<style scoped lang="less">
.candidate-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .metrics-row {
    .metric-card {
      padding: 18px 20px;
      border-radius: 12px;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

      .metric-info {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .metric-label {
          font-size: 13px;
          opacity: 0.9;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 700;
        }
      }

      .metric-icon {
        font-size: 32px;
        opacity: 0.8;
      }
    }

    .bg-gradient-blue {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    }

    .bg-gradient-emerald {
      background: linear-gradient(135deg, #10b981 0%, #047857 100%);
    }

    .bg-gradient-purple {
      background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    }

    .bg-gradient-amber {
      background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%);
    }
  }

  .filter-card {
    border-radius: 10px;

    .range-separator {
      margin: 0 6px;
      color: #94a3b8;
    }
  }

  .table-card {
    border-radius: 10px;

    .name-cell {
      display: flex;
      align-items: center;
      gap: 8px;

      .candidate-name {
        font-weight: 600;
        color: #1e293b;
      }
    }

    .job-cell {
      display: flex;
      flex-direction: column;

      .company {
        font-weight: 500;
        color: #334155;
      }

      .position {
        font-size: 12px;
        color: #64748b;
      }
    }

    .contact-cell {
      display: flex;
      flex-direction: column;
      font-size: 12px;
      color: #475569;

      .phone, .email {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }
}
</style>
