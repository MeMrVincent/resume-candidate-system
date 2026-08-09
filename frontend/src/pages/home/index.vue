<template>
  <section class="home CRound wh100 MFlex">
    <el-button
      v-for="(item, index) in list"
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
const list = [
  { value: '查看 Layout 布局模板', path: '/layout' },
  { value: '读取静态 JSON 文件', path: '/json' },
];

const jump = (path) => {
  router.push(path);
};
</script>

<style scoped lang="less">
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  .el-button + .el-button {
    margin: 20px 0 0;
  }
}
</style>
