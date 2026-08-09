<template>
  <div class="NotFind MFlex">
    <h3>{{ proxy.$t('inject.404') }}</h3>
    <el-button @click="handleGo" type="primary" size="large">
      {{ proxy.$t('inject.backHome') }}
    </el-button>
  </div>
</template>

<script>
import { useRouter } from 'vue-router';
import { defineComponent, getCurrentInstance } from 'vue';

export default defineComponent({
  name: 'InjectNotFind',
  setup(){
    const router = useRouter();
    const { proxy } = getCurrentInstance();
    const handleGo = () => {
      router.replace('/home/index');
    };
    return { handleGo, proxy };
  },
});
</script>

<style scoped lang="less">
.NotFind {
  background:#fff; position:relative; width:100%; height:100%; padding:0 0 15%;
  h3 { font-size:34px; margin:30px 0; }
}
</style>
