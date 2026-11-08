<template>
  <CandidateResumeListTab
    v-bind="props"
    :title="t('education.title')"
    :add-label="t('education.add')"
    update-method="candidateResumeEducationsUpdate"
    :fields="fields"
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

const degreeRankMap = {
  博士后: '7',
  博士: '6',
  硕士: '5',
  本科: '4',
  大专: '3',
  高中: '2',
  中专: '2',
  初中: '1',
  小学: '1',
};

const fields = computed(() => [
  { key: 'school_name', label: t('education.school'), minWidth: 180 },
  { key: 'school_major_name', label: t('education.major'), minWidth: 160 },
  {
    key: 'school_degree_type',
    label: t('education.degreeType'),
    type: 'select',
    options: [
      { label: t('options.degrees.postdoc'), value: '博士后' },
      { label: t('options.degrees.doctor'), value: '博士' },
      { label: t('options.degrees.master'), value: '硕士' },
      { label: t('options.degrees.bachelor'), value: '本科' },
      { label: t('options.degrees.college'), value: '大专' },
      { label: t('options.degrees.highSchool'), value: '高中' },
      { label: t('options.degrees.vocational'), value: '中专' },
      { label: t('options.degrees.middleSchool'), value: '初中' },
      { label: t('options.degrees.primarySchool'), value: '小学' },
    ],
    allowCreate: false,
    minWidth: 110,
    onChange: (form, value) => { form.school_degree_rank = degreeRankMap[value] || ''; },
  },
  {
    key: 'school_degree_rank',
    label: t('education.degreeRank'),
    readonly: true,
    placeholder: t('education.rankPlaceholder'),
    minWidth: 100,
  },
  {
    key: 'school_education_type',
    label: t('education.educationType'),
    type: 'select',
    options: [
      { label: t('options.educationType.fullTimePostgrad'), value: '全日制研究生' },
      { label: t('options.educationType.fullTimeCollege'), value: '全日制大学' },
      { label: t('options.educationType.fullTimeAssociate'), value: '全日制大专' },
      { label: t('options.educationType.fullTimeHighSchool'), value: '全日制高中' },
      { label: t('options.educationType.fullTimeVocational'), value: '全日制中专' },
    ],
    minWidth: 150,
  },
  { key: 'school_start_ym', label: t('education.startYm'), type: 'month', minWidth: 150 },
  { key: 'school_end_ym', label: t('education.endYm'), type: 'month', minWidth: 160 },
]);
</script>
