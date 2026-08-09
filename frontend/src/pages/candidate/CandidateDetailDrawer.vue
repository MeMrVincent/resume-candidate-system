<template>
  <el-drawer
    v-model="candidateStore.detailDrawerVisible"
    title="候选人全景画像"
    size="55%"
    destroy-on-close
    :before-close="handleClose"
  >
    <div v-loading="candidateStore.detailLoading" class="detail-container">
      <template v-if="detail && detail.profile">
        <!-- 头部全景卡片 -->
        <div class="profile-header-card">
          <div class="header-main">
            <el-avatar :size="64" class="profile-avatar">
              {{ detail.profile.full_name ? detail.profile.full_name.charAt(0) : '未' }}
            </el-avatar>
            <div class="profile-info">
              <div class="name-bar">
                <h2>{{ detail.profile.full_name }}</h2>
                <el-tag type="primary" effect="dark" size="small">{{ detail.profile.gender || '未知' }}</el-tag>
                <el-tag v-if="detail.profile.age" type="info" size="small">{{ detail.profile.age }}岁</el-tag>
                <el-tag type="success" size="small">{{ detail.profile.city || '城市未填' }}</el-tag>
              </div>
              <p class="current-job">
                <el-icon><Briefcase /></el-icon>
                {{ detail.profile.current_company || '暂无公司' }} · {{ detail.profile.current_position || '暂无职位' }}
              </p>
            </div>
          </div>

          <!-- 快捷联系工具栏 -->
          <div class="contact-actions">
            <el-button
              v-if="detail.profile.primary_phone"
              type="success"
              plain
              size="small"
              :icon="Phone"
              @click="copyText(detail.profile.primary_phone, '电话号码')"
            >
              {{ detail.profile.primary_phone }} (复制)
            </el-button>

            <el-button
              v-if="detail.profile.primary_email"
              type="primary"
              plain
              size="small"
              :icon="Message"
              @click="copyText(detail.profile.primary_email, '邮箱')"
            >
              {{ detail.profile.primary_email }} (复制)
            </el-button>
          </div>
        </div>

        <!-- 详细选项卡分类 -->
        <el-tabs v-model="activeTab" class="detail-tabs">
          <!-- 1. 全景档案 -->
          <el-tab-pane label="全景档案" name="profile">
            <div class="tab-section">
              <h4 class="section-title"><el-icon><User /></el-icon> 基础资料快照</h4>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="婚姻状况">{{ detail.profile.marital_status || '-' }}</el-descriptions-item>
                <el-descriptions-item label="户籍">{{ detail.profile.household_registration || '-' }}</el-descriptions-item>
                <el-descriptions-item label="最高学历">{{ detail.profile.highest_school }} ({{ detail.profile.highest_degree_type }})</el-descriptions-item>
                <el-descriptions-item label="专业">{{ detail.profile.highest_major || '-' }}</el-descriptions-item>
                <el-descriptions-item label="居住地址" :span="2">{{ detail.profile.address || '-' }}</el-descriptions-item>
              </el-descriptions>

              <h4 class="section-title mt-4"><el-icon><Aim /></el-icon> 求职意向</h4>
              <template v-if="detail.expectations && detail.expectations.length > 0">
                <div v-for="(exp, idx) in detail.expectations" :key="idx" class="expectation-box">
                  <el-tag type="warning">期望职位: {{ exp.expected_position || '未指定' }}</el-tag>
                  <el-tag type="info">期望城市: {{ exp.expected_city || '未指定' }}</el-tag>
                  <el-tag type="success">期望薪资: {{ exp.expected_salary_text || '面议' }}</el-tag>
                </div>
              </template>
              <p v-else class="text-muted">暂无求职意向记录</p>

              <h4 class="section-title mt-4"><el-icon><Document /></el-icon> 个人评价与总结</h4>
              <div class="summary-box">
                {{ detail.profile.personal_summary || '暂无个人总结' }}
              </div>
            </div>
          </el-tab-pane>

          <!-- 2. 工作履历 -->
          <el-tab-pane label="工作履历" name="work">
            <div class="tab-section">
              <el-timeline v-if="detail.workExperiences && detail.workExperiences.length > 0">
                <el-timeline-item
                  v-for="(w, idx) in detail.workExperiences"
                  :key="idx"
                  :timestamp="`${w.start_date || '开始'} ~ ${w.end_date || '至今'}`"
                  placement="top"
                  type="primary"
                >
                  <el-card class="timeline-card" shadow="hover">
                    <div class="timeline-card-header">
                      <h3>{{ w.company_name }}</h3>
                      <el-tag type="primary" size="small">{{ w.position_title }}</el-tag>
                    </div>
                    <p v-if="w.department" class="text-sub">部门: {{ w.department }}</p>
                    <div v-if="w.responsibilities" class="content-block">
                      <strong>工作职责:</strong>
                      <p>{{ w.responsibilities }}</p>
                    </div>
                    <div v-if="w.achievements" class="content-block mt-2">
                      <strong>工作业绩:</strong>
                      <p>{{ w.achievements }}</p>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
              <el-empty v-else description="暂无工作经历记录" />
            </div>
          </el-tab-pane>

          <!-- 3. 教育背景与技能证书 -->
          <el-tab-pane label="教育/技能/语言" name="education">
            <div class="tab-section">
              <h4 class="section-title"><el-icon><Reading /></el-icon> 教育背景</h4>
              <el-table :data="detail.educations || []" size="small" border style="width: 100%">
                <el-table-column prop="school_name" label="学校名称" />
                <el-table-column prop="major_name" label="专业" />
                <el-table-column prop="degree_type" label="学历" width="100" />
                <el-table-column label="时间段">
                  <template #default="{ row }">
                    {{ row.start_date }} ~ {{ row.end_date }}
                  </template>
                </el-table-column>
              </el-table>

              <h4 class="section-title mt-4"><el-icon><Star /></el-icon> 技能与语言能力</h4>
              <div class="tags-group">
                <el-tag v-for="(sk, idx) in detail.skills || []" :key="idx" type="info" class="mr-2 mb-2">
                  {{ sk.skill_name }} {{ sk.proficiency_level ? `(${sk.proficiency_level})` : '' }}
                </el-tag>
                <el-tag v-for="(l, idx) in detail.languages || []" :key="'lang-'+idx" type="success" class="mr-2 mb-2">
                  {{ l.language_name }}: {{ l.proficiency_level || l.certificate_name }}
                </el-tag>
              </div>
            </div>
          </el-tab-pane>

          <!-- 4. 沟通记录与追踪 -->
          <el-tab-pane label="沟通跟进" name="communication">
            <div class="tab-section">
              <div class="comm-action-bar mb-4">
                <el-button type="primary" size="small" :icon="Plus" @click="showAddCommDialog = true">
                  新增沟通记录
                </el-button>
              </div>

              <el-timeline v-if="detail.communications && detail.communications.length > 0">
                <el-timeline-item
                  v-for="(c, idx) in detail.communications"
                  :key="idx"
                  :timestamp="c.communication_date"
                  type="success"
                >
                  <div class="comm-item">
                    <el-tag size="small" type="warning">{{ c.communication_type }}</el-tag>
                    <p class="comm-summary">{{ c.summary }}</p>
                  </div>
                </el-timeline-item>
              </el-timeline>
              <el-empty v-else description="暂无历史沟通跟进记录" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useCandidateStore } from '@/stores/candidateStore';
import { ElMessage } from 'element-plus';
import {
  Briefcase,
  Phone,
  Message,
  User,
  Aim,
  Document,
  Reading,
  Star,
  Plus,
} from '@element-plus/icons-vue';

const candidateStore = useCandidateStore();
const activeTab = ref('profile');
const showAddCommDialog = ref(false);

const detail = computed(() => candidateStore.currentCandidateDetail);

const handleClose = (done) => {
  candidateStore.closeCandidateDetail();
  done();
};

const copyText = (text, name) => {
  navigator.clipboard.writeText(text);
  ElMessage.success(`已成功复制${name}: ${text}`);
};
</script>

<style scoped lang="less">
.detail-container {
  padding: 0 10px;

  .profile-header-card {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #ffffff;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-main {
      display: flex;
      align-items: center;
      gap: 16px;

      .profile-avatar {
        background-color: #0284c7;
        font-size: 24px;
        font-weight: bold;
      }

      .profile-info {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .name-bar {
          display: flex;
          align-items: center;
          gap: 10px;

          h2 {
            margin: 0;
            font-size: 22px;
          }
        }

        .current-job {
          margin: 0;
          font-size: 13px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 6px;
        }
      }
    }

    .contact-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  }

  .detail-tabs {
    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      margin: 16px 0 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .expectation-box {
      display: flex;
      gap: 10px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
    }

    .summary-box {
      background: #f1f5f9;
      padding: 14px;
      border-radius: 8px;
      font-size: 13px;
      color: #334155;
      line-height: 1.6;
    }

    .timeline-card {
      .timeline-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        h3 {
          margin: 0;
          font-size: 16px;
          color: #0f172a;
        }
      }

      .text-sub {
        font-size: 12px;
        color: #64748b;
        margin: 6px 0;
      }

      .content-block {
        font-size: 13px;
        color: #334155;

        strong {
          color: #0284c7;
        }

        p {
          margin: 4px 0 0;
        }
      }
    }

    .comm-item {
      display: flex;
      align-items: center;
      gap: 10px;

      .comm-summary {
        margin: 0;
        font-size: 13px;
        color: #334155;
      }
    }
  }

  .mt-4 { margin-top: 16px; }
  .mt-2 { margin-top: 8px; }
  .mb-4 { margin-bottom: 16px; }
  .mr-2 { margin-right: 8px; }
  .mb-2 { margin-bottom: 8px; }
}
</style>
