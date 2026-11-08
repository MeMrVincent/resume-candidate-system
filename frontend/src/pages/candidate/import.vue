<template>
  <div class="CandidateImport">
    <!-- 选择区 | Selection area | 選択エリア -->
    <div class="card selectArea">
      <div class="hintText">{{ proxy.$t("candidateImport.hint") }}</div>
      <div class="actionRow">
        <el-button type="primary" round @click="handlePickFilesClick">{{ proxy.$t("candidateImport.pickFiles") }}</el-button>
        <el-button type="primary" plain round @click="handlePickDirectoryClick">{{ proxy.$t("candidateImport.pickDirectory") }}</el-button>
        <el-button type="info" round :disabled="selectedPaths.length === 0" @click="selectedPaths = []">{{ proxy.$t("btn.reset") }}</el-button>
        <el-button type="success" round :loading="isImporting" :disabled="selectedPaths.length === 0" @click="handleImportClick">
          {{ proxy.$t("candidateImport.startImport") }}
        </el-button>
      </div>
      <el-empty v-if="selectedPaths.length === 0" :image-size="60" :description="proxy.$t('candidateImport.noSelection')" />
      <ul v-else class="selectedPathList">
        <li v-for="selectedPath in selectedPaths" :key="selectedPath">{{ selectedPath }}</li>
      </ul>
      <el-alert v-if="lastResult" class="resultAlert" type="success" :closable="false" show-icon
        :title="proxy.$t('candidateImport.resultSummary', lastResult)" />
    </div>

    <!-- 导入历史 | Import history | インポート履歴 -->
    <div class="sectionTitle">{{ proxy.$t("candidateImport.history") }}</div>
    <el-table class="commonTable" :data="batchTable.list" v-loading="batchTable.isLoading" height="100%">
      <el-table-column prop="id" :label="proxy.$t('candidateImport.batchNo')" width="80" />
      <el-table-column prop="source_dir" :label="proxy.$t('candidateImport.source')" min-width="260" show-overflow-tooltip />
      <el-table-column prop="total_files" :label="proxy.$t('candidateImport.totalFiles')" width="90" />
      <el-table-column prop="created_count" :label="proxy.$t('candidateImport.created')" width="90" />
      <el-table-column prop="updated_count" :label="proxy.$t('candidateImport.updated')" width="90" />
      <el-table-column prop="skipped_count" :label="proxy.$t('candidateImport.skipped')" width="90" />
      <el-table-column prop="failed_count" :label="proxy.$t('candidateImport.failed')" width="90" />
      <el-table-column prop="warning_count" :label="proxy.$t('candidateImport.warnings')" width="90" />
      <el-table-column prop="started_at" :label="proxy.$t('candidateImport.startedAt')" width="180">
        <template #default="scope">{{ formatTimestamp(scope.row.started_at) }}</template>
      </el-table-column>
      <el-table-column fixed="right" :label="proxy.$t('lan.operate')" width="120" align="center">
        <template #default="scope">
          <el-button link type="primary" size="small" :disabled="scope.row.warning_count + scope.row.failed_count === 0"
            @click="handleIssuesClick(scope.row)">{{ proxy.$t("candidateImport.viewIssues") }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 警告/错误明细 | Warning/error details | 警告／エラー明細 -->
    <el-dialog v-model="issueDialog.isVisible" :title="proxy.$t('candidateImport.issueTitle', { batchId: issueDialog.batchId })" width="900px">
      <el-table :data="issueDialog.list" v-loading="issueDialog.isLoading" height="420">
        <el-table-column prop="file_name" :label="proxy.$t('candidateImport.fileName')" min-width="220" show-overflow-tooltip />
        <el-table-column prop="severity" :label="proxy.$t('candidateImport.severity')" width="90" />
        <el-table-column prop="error_code" :label="proxy.$t('candidateImport.issueCode')" width="150" />
        <el-table-column prop="message" :label="proxy.$t('candidateImport.message')" min-width="260" show-overflow-tooltip />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, getCurrentInstance } from "vue";
import { ElMessage } from "element-plus";

const { proxy } = getCurrentInstance();

const selectedPaths = ref([]);
const isImporting = ref(false);
const lastResult = ref(null);
const batchTable = reactive({ list: [], isLoading: false });
const issueDialog = reactive({ isVisible: false, isLoading: false, batchId: 0, list: [] });

onMounted(() => {
  loadBatchTable();
});

/** 时间戳显示为本地时间 | Shows a timestamp in local time | タイムスタンプをローカル時間で表示する */
const formatTimestamp = timestampText => (timestampText ? new Date(timestampText).toLocaleString() : "");

/** 加载导入历史 | Loads the import history | インポート履歴を読み込む */
const loadBatchTable = async () => {
  batchTable.isLoading = true;
  const res = await proxy.$API.candidateImportBatchesList();
  batchTable.isLoading = false;
  if (res.code === 0) batchTable.list = res.data;
};

/**
 * 把选择结果并入待导入列表（去重）
 * Merges the picked paths into the to-import list (de-duplicated)
 * 選択結果を取り込み待ちリストに追加する（重複除去）
 */
const mergeSelectedPaths = pickResultData => {
  if (pickResultData.canceled) return;
  selectedPaths.value = [...new Set([...selectedPaths.value, ...pickResultData.selectedPaths])];
};

const handlePickFilesClick = async () => {
  const res = await proxy.$API.candidateImportPickFiles();
  if (res.code === 0) mergeSelectedPaths(res.data);
};

const handlePickDirectoryClick = async () => {
  const res = await proxy.$API.candidateImportPickDirectory();
  if (res.code === 0) mergeSelectedPaths(res.data);
};

/**
 * 开始导入：后端逐个文件解析写库，完成后刷新历史
 * Starts the import: the backend parses and saves file by file, then the history is refreshed
 * インポート開始：バックエンドがファイルごとに解析して保存し、完了後に履歴を更新する
 */
const handleImportClick = async () => {
  isImporting.value = true;
  const res = await proxy.$API.candidateImportRun([...selectedPaths.value]);
  isImporting.value = false;
  if (res.code !== 0) return;
  lastResult.value = res.data;
  selectedPaths.value = [];
  ElMessage.success(proxy.$t("candidateImport.importDone"));
  loadBatchTable();
};

const handleIssuesClick = async batchRow => {
  issueDialog.batchId = batchRow.id;
  issueDialog.list = [];
  issueDialog.isVisible = true;
  issueDialog.isLoading = true;
  const res = await proxy.$API.candidateImportIssuesList(batchRow.id);
  issueDialog.isLoading = false;
  if (res.code === 0) issueDialog.list = res.data;
};
</script>

<style scoped lang="less">
.CandidateImport {
  display: flex;
  flex-direction: column;
  height: 100%;

  .selectArea {
    padding: 16px;
    margin-bottom: 16px;
    background: #fff;
    border-radius: 8px;

    .hintText {
      color: #64748b;
      margin-bottom: 12px;
    }
    .actionRow {
      margin-bottom: 12px;
    }
    .selectedPathList {
      margin: 0;
      padding-left: 20px;
      max-height: 140px;
      overflow-y: auto;
      color: #334155;
      word-break: break-all;
    }
    .resultAlert {
      margin-top: 12px;
    }
  }
  .sectionTitle {
    font-weight: 600;
    margin-bottom: 8px;
  }
}
</style>
