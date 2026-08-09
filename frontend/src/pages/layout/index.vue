<template>
  <div class="wrapper wh100">
    <!--Header Start-->
    <Header />
    <!--Header End-->
    <!--el-main Start-->
    <el-main class="wh100">
      <router-view v-slot="{ Component, route }" :key="cRoute">
        <transition appear name="fade-transform" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </transition>
      </router-view>
    </el-main>
    <!--el-main End-->
  </div>
</template>

<script setup>
import Header from './header.vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
let cRoute = computed(() => {
  return router.currentRoute.value.fullPath;
});
</script>
<style scoped lang="less">
.wrapper {
  flex-direction:column; display: flex; position:relative;
}
</style>
