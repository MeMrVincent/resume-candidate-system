<template>
  <el-tooltip
    :disabled="!overflowing || empty"
    :content="text"
    placement="top"
    :show-after="250"
    :enterable="true"
    :popper-style="tooltipStyle"
  >
    <span ref="contentRef" class="overflow-text" @mouseenter="measure">{{ displayText }}</span>
  </el-tooltip>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({ value: { type: [String, Number], default: '' } });
const contentRef = ref(null);
const overflowing = ref(false);
const tooltipWidth = ref(120);
const empty = computed(() => props.value === null || props.value === undefined || props.value === '');
const text = computed(() => empty.value ? '' : String(props.value));
const displayText = computed(() => empty.value ? '--' : text.value);
const tooltipStyle = computed(() => ({
  width: `${tooltipWidth.value}px`,
  maxWidth: `${tooltipWidth.value}px`,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  lineHeight: '1.6',
}));
const measure = () => {
  const content = contentRef.value;
  if (!content) return;
  const cell = content.closest('td');
  tooltipWidth.value = Math.max(120, Math.round(cell?.getBoundingClientRect().width || content.clientWidth));
  overflowing.value = content.scrollWidth > content.clientWidth || content.scrollHeight > content.clientHeight;
};
</script>

<style scoped>
.overflow-text{display:block;width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style>
