<template>
  <el-drawer
    :model-value="modelValue"
    :title="$t('drawer.title')"
    size="62%"
    destroy-on-close
    :before-close="close"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="detail-container">
      <template v-if="detail?.profile">
        <header class="profile-header">
          <h2>{{ detail.profile.full_name || $t('drawer.unnamed') }}</h2>
          <el-radio-group v-if="resumeOptions.length > 1" v-model="selectedResumeId" size="small" @change="changeResume">
            <el-radio-button v-for="option in resumeOptions" :key="option.id" :value="option.id">{{ option.label }}</el-radio-button>
          </el-radio-group>
        </header>

        <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane :label="$t('drawer.tabProfile')" name="profile">
            <CandidateProfileTab :candidate-id="candidateId" :resume-id="selectedResumeId" :detail="detail" @saved="reloadAfterSave" />
          </el-tab-pane>
          <el-tab-pane :label="$t('drawer.tabExpectations')" name="expectations">
            <CandidateExpectationTab :candidate-id="candidateId" :resume-id="selectedResumeId" :items="detail.expectations || []" @saved="reloadAfterSave" />
          </el-tab-pane>
          <el-tab-pane :label="$t('drawer.tabWork')" name="work">
            <CandidateWorkTab :candidate-id="candidateId" :resume-id="selectedResumeId" :items="detail.workExperiences || []" @saved="reloadAfterSave" />
          </el-tab-pane>
          <el-tab-pane :label="$t('drawer.tabProjects')" name="projects">
            <CandidateProjectTab :candidate-id="candidateId" :resume-id="selectedResumeId" :items="detail.projects || []" @saved="reloadAfterSave" />
          </el-tab-pane>
          <el-tab-pane :label="$t('drawer.tabEducation')" name="education">
            <CandidateEducationTab :candidate-id="candidateId" :resume-id="selectedResumeId" :items="detail.educations || []" @saved="reloadAfterSave" />
          </el-tab-pane>
          <el-tab-pane :label="$t('drawer.tabTrainings')" name="trainings">
            <CandidateTrainingTab :candidate-id="candidateId" :resume-id="selectedResumeId" :items="detail.trainings || []" @saved="reloadAfterSave" />
          </el-tab-pane>
          <el-tab-pane :label="$t('drawer.tabSkills')" name="skills">
            <CandidateSkillTab :candidate-id="candidateId" :resume-id="selectedResumeId" :items="detail.skills || []" @saved="reloadAfterSave" />
          </el-tab-pane>
          <el-tab-pane :label="$t('drawer.tabLanguages')" name="languages">
            <CandidateLanguageTab :candidate-id="candidateId" :resume-id="selectedResumeId" :items="detail.languages || []" @saved="reloadAfterSave" />
          </el-tab-pane>
          <el-tab-pane :label="$t('drawer.tabCertificates')" name="certificates">
            <CandidateCertificateTab :candidate-id="candidateId" :resume-id="selectedResumeId" :items="detail.certificates || []" @saved="reloadAfterSave" />
          </el-tab-pane>
          <el-tab-pane :label="$t('drawer.tabCommunication')" name="communication">
            <CandidateCommunicationTab :candidate-id="candidateId" :items="detail.communications || []" @saved="reloadAfterSave" />
          </el-tab-pane>
        </el-tabs>
      </template>
      <el-empty v-else-if="!loading" :description="$t('drawer.notFound')" />
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { candidateApi } from '@/api/candidateApi';
import CandidateProfileTab from './tabs/CandidateProfileTab.vue';
import CandidateExpectationTab from './tabs/CandidateExpectationTab.vue';
import CandidateWorkTab from './tabs/CandidateWorkTab.vue';
import CandidateProjectTab from './tabs/CandidateProjectTab.vue';
import CandidateEducationTab from './tabs/CandidateEducationTab.vue';
import CandidateTrainingTab from './tabs/CandidateTrainingTab.vue';
import CandidateSkillTab from './tabs/CandidateSkillTab.vue';
import CandidateLanguageTab from './tabs/CandidateLanguageTab.vue';
import CandidateCertificateTab from './tabs/CandidateCertificateTab.vue';
import CandidateCommunicationTab from './tabs/CandidateCommunicationTab.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  candidateId: { type: Number, default: null },
});
const emit = defineEmits(['update:modelValue', 'changed']);
const { t } = useI18n();
const detail = ref(null);
const loading = ref(false);
const activeTab = ref('profile');
const selectedResumeId = ref(null);
const resumeOptions = ref([]);
const languageLabels = computed(() => ({
  zh: t('layout.langZh'),
  en: t('layout.langEn'),
  jp: t('layout.langJa'),
  ja: t('layout.langJa'),
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  kr: '한국어',
  ko: '한국어',
}));

const load = async () => {
  if (!props.candidateId) return;
  loading.value = true;
  try {
    detail.value = await candidateApi.candidateResumeGet(props.candidateId, selectedResumeId.value);
    selectedResumeId.value = detail.value.resumeId;
    resumeOptions.value = (detail.value.resumeOptions || []).map((option, index, all) => {
      const sameLanguage = all.filter((item) => item.resume_language === option.resume_language);
      const suffix = sameLanguage.length > 1 ? ` ${sameLanguage.findIndex((item) => item.id === option.id) + 1}` : '';
      const langText = languageLabels.value[option.resume_language] || option.resume_language.toUpperCase();
      return { ...option, label: `${langText}${suffix}` };
    });
  } catch (error) {
    ElMessage.error(`${t('drawer.loadFailed')}: ${error.message}`);
  } finally {
    loading.value = false;
  }
};
const reloadAfterSave = async () => { await load(); emit('changed'); };
const changeResume = async () => { activeTab.value = 'profile'; await load(); };
const close = (done) => { detail.value = null; activeTab.value = 'profile'; selectedResumeId.value = null; resumeOptions.value = []; done(); };

watch(() => [props.modelValue, props.candidateId], ([visible, id]) => {
  if (visible && id) { activeTab.value = 'profile'; selectedResumeId.value = null; load(); }
}, { immediate: true });
</script>

<style scoped lang="less">
.detail-container { min-height: 360px; padding: 0 8px; }
.profile-header { display:flex;align-items:center;gap:16px;padding:16px 20px;margin-bottom:18px;border-radius:10px;background:#163657;color:#fff;h2{margin:0;font-size:22px;font-weight:700}:deep(.el-radio-button__inner){border-color:#7aa2ca;background:transparent;color:#dbeafe}:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner){background:#3b82f6;color:#fff;border-color:#3b82f6;box-shadow:-1px 0 0 0 #3b82f6}}
.detail-tabs { :deep(.el-tabs__header) { margin-bottom: 20px; } :deep(.el-tabs__item) { font-weight: 600; } }
</style>
