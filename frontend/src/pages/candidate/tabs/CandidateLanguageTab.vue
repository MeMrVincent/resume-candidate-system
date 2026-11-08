<template>
  <CandidateResumeListTab
    v-bind="props"
    :title="t('languages.title')"
    :add-label="t('languages.add')"
    update-method="candidateResumeLanguagesUpdate"
    :fields="fields"
    dialog-width="720px"
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
  {
    key: 'language_name',
    label: t('languages.name'),
    type: 'select',
    options: [
      { label: t('options.languages.japanese'), value: '日语' },
      { label: t('options.languages.english'), value: '英语' },
      { label: t('options.languages.german'), value: '德语' },
      { label: t('options.languages.french'), value: '法语' },
      { label: t('options.languages.korean'), value: '韩语' },
      { label: t('options.languages.mandarin'), value: '普通话' },
      { label: t('options.languages.cantonese'), value: '粤语' },
    ],
    minWidth: 140,
  },
  {
    key: 'language_level',
    label: t('languages.level'),
    type: 'select',
    options: [
      { label: t('options.languageLevels.beginner'), value: '入门' },
      { label: t('options.languageLevels.general'), value: '一般' },
      { label: t('options.languageLevels.good'), value: '良好' },
      { label: t('options.languageLevels.skilled'), value: '熟练' },
      { label: t('options.languageLevels.fluent'), value: '流利' },
      { label: t('options.languageLevels.business'), value: '商务水平' },
      { label: t('options.languageLevels.native'), value: '母语' },
    ],
    minWidth: 180,
  },
  { key: 'language_certificate', label: t('languages.certificate'), minWidth: 140 },
  { key: 'language_certificate_time', label: t('languages.certificateTime'), type: 'date', minWidth: 170 },
]);
</script>
