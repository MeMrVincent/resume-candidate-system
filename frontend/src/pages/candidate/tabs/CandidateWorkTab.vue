<template>
  <CandidateResumeListTab
    v-bind="props"
    :title="t('work.title')"
    :add-label="t('work.add')"
    update-method="candidateResumeWorkExperiencesUpdate"
    :fields="fields"
    dialog-width="980px"
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
  { key: 'position_start', label: t('work.startYm'), type: 'month', minWidth: 160 },
  { key: 'position_resigned', label: t('work.endYm'), type: 'month', minWidth: 160 },
  { key: 'position', label: t('work.position'), minWidth: 180 },
  { key: 'company_name', label: t('work.company'), minWidth: 300 },
  { key: 'company_employees', label: t('work.companySize'), minWidth: 120 },
  { key: 'company_industry', label: t('work.industry'), minWidth: 150 },
  { key: 'position_type', label: t('work.positionCategory'), minWidth: 120 },
  { key: 'position_salary', label: t('work.monthlySalary'), minWidth: 120 },
  { key: 'position_dept', label: t('work.department'), minWidth: 120 },
  { key: 'position_report_to', label: t('work.reportTo'), minWidth: 120 },
  { key: 'position_subordinate', label: t('work.subordinates'), minWidth: 100 },
  {
    key: 'employment_type',
    label: t('work.employmentType'),
    type: 'select',
    options: [
      { label: t('options.employmentType.fullTime'), value: '全职' },
      { label: t('options.employmentType.partTime'), value: '兼职' },
      { label: t('options.employmentType.internship'), value: '实习' },
    ],
    minWidth: 110,
  },
  { key: 'annual_salary_min', label: t('work.annualMin'), minWidth: 110 },
  { key: 'annual_salary_max', label: t('work.annualMax'), minWidth: 110 },
  {
    key: 'status',
    label: t('work.status'),
    type: 'select',
    options: [
      { label: t('options.workStatus.active'), value: '在职' },
      { label: t('options.workStatus.resigned'), value: '离职' },
    ],
    minWidth: 110,
  },
  { key: 'resigned_reason', label: t('work.resignedReason'), type: 'textarea', rows: 3, minWidth: 240 },
  { key: 'position_responsibilities', label: t('work.responsibilities'), type: 'textarea', rows: 5, minWidth: 460 },
  { key: 'position_achievements', label: t('work.achievements'), type: 'textarea', rows: 4, minWidth: 380 },
]);
</script>
