<template>
  <div class="CompanyList">
    <!-- 搜索区 | Search area | 検索エリア -->
    <div class="card searchParams">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item :label="proxy.$t('company.companyName')">
            <el-input
              v-model="searchParams.keyword"
              clearable
              :placeholder="proxy.$t('lan.input')"
              @keyup.enter="loadCompanyTable(true)"
            />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item :label="proxy.$t('lan.status')">
            <el-select v-model="searchParams.status" clearable :placeholder="proxy.$t('lan.select')">
              <el-option v-for="status in companyStatusList" :key="status" :label="proxy.$t(`company.status.${status}`)" :value="status" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="10" class="actionColumn">
          <el-button type="success" round @click="loadCompanyTable(true)">{{ proxy.$t("btn.search") }}</el-button>
          <el-button type="info" round @click="handleResetClick">{{ proxy.$t("btn.reset") }}</el-button>
          <el-button type="primary" round @click="handleCreateClick">{{ proxy.$t("company.createCompany") }}</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 列表 | List | 一覧 -->
    <el-table class="commonTable" :data="table.list" v-loading="table.isLoading" height="100%">
      <el-table-column prop="company_name" :label="proxy.$t('company.companyName')" min-width="220" />
      <el-table-column prop="short_name" :label="proxy.$t('company.shortName')" min-width="120" />
      <el-table-column prop="industry" :label="proxy.$t('company.industry')" min-width="140" />
      <el-table-column prop="city" :label="proxy.$t('company.city')" min-width="100" />
      <el-table-column prop="position_total" :label="proxy.$t('company.positionTotal')" width="90" />
      <el-table-column prop="position_open" :label="proxy.$t('company.positionOpen')" width="90" />
      <el-table-column prop="status" :label="proxy.$t('lan.status')" width="110">
        <template #default="scope">
          <el-tag :type="statusTagType(scope.row.status)" size="small">{{ proxy.$t(`company.status.${scope.row.status}`) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updated_at" :label="proxy.$t('lan.updatedTime')" width="180">
        <template #default="scope">{{ formatTimestamp(scope.row.updated_at) }}</template>
      </el-table-column>
      <el-table-column fixed="right" :label="proxy.$t('lan.operate')" width="200" align="center">
        <template #default="scope">
          <el-button link type="primary" size="small" @click="handleDetailClick(scope.row)">{{ proxy.$t("btn.detail") }}</el-button>
          <el-button link type="primary" size="small" @click="handleEditClick(scope.row)">{{ proxy.$t("btn.edit") }}</el-button>
          <el-button link type="danger" size="small" @click="handleDeleteClick(scope.row)">{{ proxy.$t("btn.delete") }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 | Pagination | ページング -->
    <div class="pagination Flex">
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        background
        :page-sizes="pagination.pageList"
        :layout="pagination.layout"
        :total="pagination.totalSize"
        @size-change="handlePageSizeChange"
        @current-change="handleCurrentPageChange"
      />
    </div>

    <edit-popup ref="editPopupRef" @callback="loadCompanyTable(false)" />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, getCurrentInstance } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { pageConf } from "@/utils/pageConf";
import EditPopup from "./edit.popup.vue";

const { proxy } = getCurrentInstance();
const router = useRouter();

const companyStatusList = ["active", "inactive", "blacklisted"];
const pagination = reactive({ ...pageConf });
const searchParams = reactive({ keyword: "", status: "" });
const table = reactive({ list: [], isLoading: false });
const editPopupRef = ref(null);

onMounted(() => {
  loadCompanyTable(true);
});

/**
 * 加载公司列表。shouldResetPage 为 true 时回到第 1 页（搜索、重置时）
 * Loads the company list. When shouldResetPage is true it goes back to page 1 (on search or reset)
 * 企業一覧を読み込む。shouldResetPage が true のときは 1 ページ目に戻る（検索・リセット時）
 */
const loadCompanyTable = async shouldResetPage => {
  if (shouldResetPage) pagination.currentPage = 1;
  table.isLoading = true;
  const res = await proxy.$API.companiesSearch({
    keyword: searchParams.keyword,
    status: searchParams.status,
    page: { limit: pagination.pageSize, skip: (pagination.currentPage - 1) * pagination.pageSize }
  });
  table.isLoading = false;
  if (res.code === 0) {
    table.list = res.data.rows;
    pagination.totalSize = res.data.total;
  }
};

const handleResetClick = () => {
  searchParams.keyword = "";
  searchParams.status = "";
  loadCompanyTable(true);
};

const handleCreateClick = () => editPopupRef.value.open("create");
const handleEditClick = companyRow => editPopupRef.value.open("edit", companyRow);
const handleDetailClick = companyRow => router.push(`/company/${companyRow.id}`);

/**
 * 删除公司：有职位的公司后端只会置为停用，这里按返回的 deleteMode 给出不同提示
 * Deletes a company: the backend only deactivates a company that has positions, so different messages are shown here according to the returned deleteMode
 * 企業を削除する：求人のある企業はバックエンドで無効化されるだけなので、返された deleteMode に応じて異なるメッセージを表示する
 */
const handleDeleteClick = async companyRow => {
  try {
    await ElMessageBox.confirm(proxy.$t("message.deleteConfirm"), proxy.$t("message.confirmTitle"), { type: "warning" });
  } catch (cancelled) {
    return;
  }
  const res = await proxy.$API.companyDelete(companyRow.id);
  if (res.code === 0) {
    ElMessage.success(res.data.deleteMode === "deactivated" ? proxy.$t("company.deactivatedTip") : proxy.$t("message.deleteSuccess"));
    loadCompanyTable(false);
  }
};

const handlePageSizeChange = pageSize => {
  pagination.pageSize = pageSize;
  loadCompanyTable(true);
};
const handleCurrentPageChange = currentPage => {
  pagination.currentPage = currentPage;
  loadCompanyTable(false);
};

const statusTagType = status => ({ active: "success", inactive: "info", blacklisted: "danger" })[status] || "info";
const formatTimestamp = isoTimestamp => (isoTimestamp ? isoTimestamp.slice(0, 19).replace("T", " ") : proxy.$t("lan.none"));
</script>

<style scoped lang="less">
.CompanyList {
  display: flex;
  flex-direction: column;
  height: 100%;

  .searchParams {
    background: #fff;
    padding: 16px 16px 0;
    margin-bottom: 12px;
    border-radius: 6px;

    .actionColumn {
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
    }
  }
  .commonTable {
    flex: 1;
    min-height: 0;
  }
  .pagination {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
  }
}
</style>
