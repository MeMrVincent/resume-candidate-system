<template>
  <CandidateResumeListTab
    v-bind="props"
    :title="t('certificates.title')"
    :add-label="t('certificates.add')"
    update-method="candidateResumeCertificatesUpdate"
    :fields="fields"
    dialog-width="680px"
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
  { key: 'certificate_name', label: t('certificates.name'), minWidth: 220 },
  {
    key: 'certificate_type',
    label: t('certificates.type'),
    type: 'select',
    options: [
      { label: t('options.certificateType.certificate'), value: '证书' },
      { label: t('options.certificateType.completion'), value: '结业证' },
      { label: t('options.certificateType.training'), value: '培训证' },
    ],
    minWidth: 130,
  },
  { key: 'certificate_time', label: t('certificates.time'), type: 'date', minWidth: 170 },
]);
</script>
