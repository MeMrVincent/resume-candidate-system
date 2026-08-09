<template>
  <section class="home CRound wh100 MFlex">
    <el-button
      v-for="(item,index) in list"
      :key="index"
      size="large"
      round
      type="primary"
      @click="jump(item.path)"
    >
      {{ item.value }}
    </el-button>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
const list = [{ value: 'wallet connect and transaction', path: '/wallet' },
  { value: 'get static json file', path: '/json' }];

const jump = (path) => {
  router.push(path);
}
</script>

<style scoped lang="less">
.home {
  .el-button+.el-button {
    margin:20px 0 0;
  }
}
</style>
