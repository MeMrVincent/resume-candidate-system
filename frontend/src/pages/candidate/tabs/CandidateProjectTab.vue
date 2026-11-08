<template>
  <CandidateResumeListTab
    v-bind="props"
    :title="t('projects.title')"
    :add-label="t('projects.add')"
    update-method="candidateResumeProjectsUpdate"
    :fields="fields"
    dialog-width="960px"
    @saved="$emit('saved')"
  />
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import CandidateResumeListTab from './CandidateResumeListTab.vue';

const props = defineProps({
  candidateId: { type: Number, required: true },
  resumeId: { type: Number, required: true },
  items: { type: Array, default: () => [] },
});
defineEmits(['saved']);

const { t } = useI18n();

const fields = computed(() => [
  { key: 'sequence_no', label: t('projects.seq'), type: 'number', minWidth: 80 },
  { key: 'start_ym', label: t('projects.startYm'), type: 'month', minWidth: 160 },
  { key: 'end_ym', label: t('projects.endYm'), type: 'month', minWidth: 160 },
  { key: 'project_name', label: t('projects.name'), minWidth: 240 },
  { key: 'role_name', label: t('projects.role'), minWidth: 160 },
  { key: 'company_or_client', label: t('projects.companyOrClient'), minWidth: 300 },
  { key: 'fingerprint', label: t('projects.fingerprint'), minWidth: 140 },
  { key: 'description', label: t('projects.description'), type: 'textarea', rows: 5, minWidth: 460 },
  { key: 'responsibilities', label: t('projects.responsibilities'), type: 'textarea', rows: 4, minWidth: 380 },
  { key: 'achievements', label: t('projects.achievements'), type: 'textarea', rows: 4, minWidth: 380 },
  { key: 'keywords', label: t('projects.keywords'), minWidth: 200 },
]);
</script>
