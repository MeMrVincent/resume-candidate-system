<template>
  <CandidateResumeListTab
    v-bind="props"
    :title="t('skills.title')"
    :add-label="t('skills.add')"
    update-method="candidateResumeSkillsUpdate"
    :fields="fields"
    dialog-width="640px"
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
  { key: 'skill_name', label: t('skills.name'), minWidth: 180 },
  {
    key: 'skill_level',
    label: t('skills.level'),
    type: 'select',
    options: [
      { label: t('options.skills.understand'), value: '了解' },
      { label: t('options.skills.grasp'), value: '掌握' },
      { label: t('options.skills.proficient'), value: '熟练' },
      { label: t('options.skills.master'), value: '精通' },
    ],
    minWidth: 150,
  },
]);
</script>
