<template>
  <CandidateResumeListTab
    v-bind="props"
    :title="t('trainings.title')"
    :add-label="t('trainings.add')"
    update-method="candidateResumeTrainingsUpdate"
    :fields="fields"
    dialog-width="860px"
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
  { key: 'sequence_no', label: t('trainings.seq'), type: 'number', minWidth: 80 },
  { key: 'organization_name', label: t('trainings.org'), minWidth: 180 },
  { key: 'training_name', label: t('trainings.name'), minWidth: 220 },
  { key: 'start_ym', label: t('trainings.startYm'), type: 'month', minWidth: 150 },
  { key: 'end_ym', label: t('trainings.endYm'), type: 'month', minWidth: 150 },
  { key: 'certificate_name', label: t('trainings.certificate'), minWidth: 180 },
  { key: 'description', label: t('trainings.description'), type: 'textarea', rows: 5, minWidth: 420 },
]);
</script>
