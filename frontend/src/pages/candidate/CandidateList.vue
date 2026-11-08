<template>
  <div class="candidate-list-page">
    <!-- 顶部数据概览卡片区 / EN: Top stats overview cards / JA: 上部データ概要カードエリア -->
    <el-row :gutter="16" class="metrics-row">
      <el-col :span="6">
        <div class="metric-card bg-gradient-blue">
          <div class="metric-info">
            <span class="metric-label">{{ $t('candidateList.totalTalents') }}</span>
            <span class="metric-value">{{ databaseTotalCount.toLocaleString() }}</span>
          </div>
          <el-icon class="metric-icon"><UserFilled /></el-icon>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="metric-card bg-gradient-emerald">
          <div class="metric-info">
            <span class="metric-label">{{ $t('candidateList.currentResults') }}</span>
            <span class="metric-value">{{ totalCount }}</span>
          </div>
          <el-icon class="metric-icon"><Search /></el-icon>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="metric-card bg-gradient-purple">
          <div class="metric-info">
            <span class="metric-label">{{ $t('candidateList.ftsFullText') }}</span>
            <span class="metric-value">100%</span>
          </div>
          <el-icon class="metric-icon"><DocumentChecked /></el-icon>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="metric-card bg-gradient-amber">
          <div class="metric-info">
            <span class="metric-label">{{ $t('candidateList.dbEngine') }}</span>
            <span class="metric-value">SQLite WAL</span>
          </div>
          <el-icon class="metric-icon"><Coin /></el-icon>
        </div>
      </el-col>
    </el-row>

    <!-- 高级搜索筛选栏 / EN: Advanced search filter bar / JA: 高度な検索フィルターバー -->
    <el-card shadow="never" class="filter-card">
      <el-form :model="searchFilters" inline label-position="left">
        <el-form-item :label="$t('candidateList.fullTextSearch')">
          <el-input
            v-model="searchFilters.keyword"
            :placeholder="$t('candidateList.fullTextPlaceholder')"
            clearable
            style="width: 280px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="$t('candidateList.city')">
          <el-select
            v-model="searchFilters.city"
            :placeholder="$t('candidateList.cityPlaceholder')"
            clearable
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option :label="$t('cities.shanghai')" value="上海市" />
            <el-option :label="$t('cities.beijing')" value="北京市" />
            <el-option :label="$t('cities.shenzhen')" value="深圳市" />
            <el-option :label="$t('cities.guangzhou')" value="广州市" />
            <el-option :label="$t('cities.hangzhou')" value="杭州市" />
            <el-option :label="$t('cities.wuxi')" value="无锡市" />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('candidateList.degree')">
          <el-select
            v-model="searchFilters.degreeType"
            :placeholder="$t('candidateList.degreePlaceholder')"
            clearable
            style="width: 120px"
            @change="handleSearch"
          >
            <el-option :label="$t('candidateList.doctor')" value="博士" />
            <el-option :label="$t('candidateList.master')" value="硕士" />
            <el-option :label="$t('candidateList.bachelor')" value="本科" />
            <el-option :label="$t('candidateList.college')" value="大专" />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('candidateList.workYears')">
          <el-input-number
            v-model="searchFilters.minWorkYears"
            :min="0"
            :max="40"
            :placeholder="$t('candidateList.workYearsMin')"
            controls-position="right"
            style="width: 100px"
          />
          <span class="range-separator">-</span>
          <el-input-number
            v-model="searchFilters.maxWorkYears"
            :min="0"
            :max="40"
            :placeholder="$t('candidateList.workYearsMax')"
            controls-position="right"
            style="width: 100px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">{{ $t('candidateList.searchTalents') }}</el-button>
          <el-button :icon="Refresh" @click="handleReset">{{ $t('candidateList.resetFilters') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-pagination
      v-if="totalCount > pageSize"
      class="candidate-pagination"
      background
      layout="total, prev, pager, next"
      :total="totalCount"
      :page-size="pageSize"
      :current-page="page"
      @current-change="changePage"
    />

    <!-- 候选人数据表格区 / EN: Candidate data table / JA: 候補者データテーブルエリア -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="candidateList"
        stripe
        style="width: 100%"
        row-key="id"
        header-cell-class-name="candidate-table-header"
      >
        <el-table-column :label="$t('candidateList.colName')" min-width="140">
          <template #default="{ row }">
            <span class="candidate-name">{{ row.full_name || $t('common.unnamed') }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('candidateList.colGender')" width="76" align="center">
          <template #default="{ row }">
            <span v-if="row.gender" :class="['gender-text', row.gender === '女' ? 'female' : 'male']">
              {{ row.gender === '女' ? $t('options.gender.female') : (row.gender === '男' ? $t('options.gender.male') : row.gender) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('candidateList.colAge')" width="76" align="center">
          <template #default="{ row }">{{ calculateAge(row) ?? '-' }}</template>
        </el-table-column>

        <el-table-column :label="$t('candidateList.colJob')" min-width="220">
          <template #default="{ row }">
            <div class="job-cell">
              <span class="company">{{ row.current_company || $t('common.confidential') }}</span>
              <span class="position">{{ row.current_position || '-' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="highest_degree_type" :label="$t('candidateList.colDegree')" width="100">
          <template #default="{ row }">
            <span>{{ row.highest_degree_type || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('candidateList.colContact')" min-width="200">
          <template #default="{ row }">
            <div class="contact-cell">
              <span v-if="row.primary_phone" class="phone"><el-icon><Phone /></el-icon> {{ row.primary_phone }}</span>
              <span v-if="row.primary_email" class="email"><el-icon><Message /></el-icon> {{ row.primary_email }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="sys_updated_date" :label="$t('candidateList.colUpdateTime')" width="180">
          <template #default="{ row }">{{ formatSystemDate(row.sys_updated_date) }}</template>
        </el-table-column>

        <el-table-column :label="$t('common.action')" width="130" fixed="right">
          <template #default="{ row }">
            <el-button class="detail-button" type="primary" link @click.stop="openDetail(row.id || row.candidate_id)">
              {{ $t('candidateList.viewDetail') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 候选人画像抽屉组件 / EN: Candidate detail drawer component / JA: 候補者詳細ドロワーコンポーネント -->
    <CandidateDetailDrawer
      v-model="detailDrawerVisible"
      :candidate-id="currentCandidateId"
      @changed="refreshAfterMutation"
    />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { candidateApi } from '@/api/candidateApi';
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

const { t } = useI18n();

const searchFilters = reactive({
  keyword: '',
  city: '',
  degreeType: '',
  minWorkYears: null,
  maxWorkYears: null,
  company: '',
});
const candidateList = ref([]);
const totalCount = ref(0);
const databaseTotalCount = ref(0);
const page = ref(1);
const pageSize = 50;
const loading = ref(false);
const currentCandidateId = ref(null);
const detailDrawerVisible = ref(false);

const fetchCandidates = async () => {
  loading.value = true;
  try {
    const result = await candidateApi.candidatesSearch({
      ...searchFilters,
      page: page.value,
      pageSize,
    });
    candidateList.value = result.items || [];
    totalCount.value = result.total || 0;
  } catch (error) {
    ElMessage.error(`${t('candidateList.searchFailed')}: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  fetchCandidates();
};

const handleReset = () => {
  Object.assign(searchFilters, {
    keyword: '', city: '', degreeType: '', minWorkYears: null, maxWorkYears: null, company: '',
  });
  page.value = 1;
  fetchCandidates();
};

const openDetail = (id) => {
  currentCandidateId.value = id;
  detailDrawerVisible.value = true;
};

const calculateAge = (row) => {
  const values = String(row.birth_date || '').match(/\d+/g) || [];
  const birthYear = Number(values[0] || row.birth_year);
  if (!birthYear) return null;
  const birthMonth = Number(values[1] || 1);
  const birthDay = Number(values[2] || 1);
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
};

const formatSystemDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').replace(/([+-]\d{2}:?\d{2}|Z)$/, '');
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

onMounted(() => {
  candidateApi.candidatesCount()
    .then((count) => { databaseTotalCount.value = count; })
    .catch((error) => ElMessage.error(`${t('dashboard.statsFailed')}: ${error.message}`));
  fetchCandidates();
});

const changePage = (nextPage) => {
  page.value = nextPage;
  fetchCandidates();
};

const refreshAfterMutation = async () => {
  await fetchCandidates();
  databaseTotalCount.value = await candidateApi.candidatesCount();
};
</script>

<style scoped lang="less">
.candidate-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .candidate-pagination {
    align-self: flex-end;
  }

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
    :deep(.candidate-table-header) {
      background: #eaf2fb !important;
      color: #1e3a5f;
      font-weight: 700;
    }
    border-radius: 10px;

    .candidate-name {
      font-weight: 600;
      color: #1e293b;
    }

    .gender-text {
      font-weight: 700;

      &.male { color: #2563eb; }
      &.female { color: #e11d48; }
    }

    .detail-button {
      font-size: 15px;
      font-weight: 600;
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
