<template>
  <el-header class="Flex" :class="proxy.$AppEnv.sysApp" tag="SE">
    <!--Left Start-->
    <div class="L LFlex">
      <div class="logo Flex">
        <img :src="logo.logo" alt="logo">
        <span v-html="logo.title.replace('Vue', '<i class=\'color\'>Vue</i>')" />
      </div>
    </div>
    <!--Left End-->
    <!--right Start-->
    <div class="R Flex">
      <!--Language Change Start-->
      <el-dropdown trigger="hover">
        <div class="LanChange Flex pointer">
          {{ proxy.$t('lan.language')+proxy.$t('lan.colon')+lan.select }}
          <el-icon class="Flex">
            <CaretBottom />
          </el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="(item,index) in lan.list" :key="index" :divided="index > 0" class="Flex" @click="handleLanChange(item)">
              {{ item.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <!--Language Change End-->
    </div>
    <!--right End-->
  </el-header>
</template>

<script setup>
import { getCurrentInstance, onMounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';

const { proxy } = getCurrentInstance();
const { locale } = useI18n();
const logo = reactive({
  title: proxy.$AppEnv.title,
  logo: proxy.$AppEnv.logo,
});
const lan = reactive({
  select: '',
  list: [ { label: 'English', value: 'en-us' }, { label: '中文', value: 'zh-cn' } ],
});

onMounted(() => {
  for(let i=0;i<lan.list.length;i++){
    if(lan.list[i].value === locale.value){
      lan.select = lan.list[i].label;
    }
  }
});

const handleLanChange = (item) => {
  locale.value = item.value;
  lan.select = item.label;
  localStorage.setItem('language', locale.value);
}
</script>
<style lang="less">
.el-header {
  height:60px; box-sizing: border-box; padding: 0 48px; background-color: var(--el-bg-color);
  &.lineApp { box-shadow: 0 0 5px rgba(0, 196, 74, 0.4); }
  &.tgApp { box-shadow: 0 0 5px rgba(26, 115, 232, 0.4); }
  .L {
    .logo {
      box-sizing: border-box;
      img { height: 28px; margin-right: 8px; }
      :deep(span) {
        font-size: 22px; font-weight: bold;
        i { color:var(--el-color-primary); font-weight: bold; }
      }
    }
  }
  .R {
    .LanChange {  }
  }
}
</style>
