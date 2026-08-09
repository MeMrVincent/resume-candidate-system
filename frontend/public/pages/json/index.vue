<template>
  <section class="agree wh100">
    <el-scrollbar>
      <template v-for="(item,index) in content" :key="index">
        <h2 v-if="item.tags === 'h2'" class="Flex" :class="item.class" v-html="sanitize(item[lan])" />
        <h3 v-if="item.tags === 'h3'" class="LFlex" :class="item.class" v-html="sanitize(item[lan])" />
        <h4 v-if="item.tags === 'h4'" class="LFlex" :class="item.class" v-html="sanitize(item[lan])" />
        <h5 v-if="item.tags === 'h5'" class="LFlex" :class="item.class" v-html="sanitize(item[lan])" />
        <p v-if="item.tags === 'p'" :class="item.class" v-html="sanitize(item[lan])" />
      </template>
    </el-scrollbar>
  </section>
</template>

<script setup>
import { getCurrentInstance, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
const { proxy } = getCurrentInstance();
const content = ref([]);
const lan = ref('en');
lan.value = locale.value.toLocaleLowerCase().includes('zh') ? 'cn':'en';

onMounted(async () => {
  content.value = await proxy.$API.getParamJSON('json');
});

watch(locale, (newLocale) => {
  lan.value = newLocale.toLocaleLowerCase().includes('zh') ? 'cn':'en';
})

const sanitize = (val) => {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/g, '')
    .replace(/on\w+\s*=\s*'[^']*'/g, '')
    .replace(/on\w+\s*=\s*[^\s>]+/g, '');
};
</script>

<style scoped lang="less">
.agree {
  :deep(.el-scrollbar__view) {
    max-width:1000px; margin:0 auto; padding:50px 0;
  }
  p {
    font-size: 14px; line-height:24px; position:relative;
    :deep(b) { font-weight:bold; }
    &.FDot {
      padding:0 0 0 12px;
      &:before { position: absolute; background:var(--el-color-primary); left:0; top:9px; content:''; height:6px; width:6px; z-index:1; border-radius:100%; }
    }
    &.Num {
      padding:0 0 0 20px;
      :deep(i) { font-weight:bold; position: absolute; left:0; top:0; }
    }
  }
  h5 { font-size: 14px; line-height: 24px; font-weight:bold; margin:5px 0 0; }
  h4 { font-size: 14px; line-height: 30px; font-weight:bold; margin:5px 0 0; }
  h3 { font-size: 22px; line-height: 36px; font-weight:bold; margin: 20px 0 0; }
  h2 { font-size: 24px; font-weight:bold; line-height:40px; }
}
</style>
