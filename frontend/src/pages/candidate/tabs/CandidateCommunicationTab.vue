<template>
  <section>
    <div class="tab-toolbar">
      <h3>{{ $t('communication.title') }}</h3>
      <el-button type="primary" :icon="Plus" @click="openEditor()">{{ $t('communication.add') }}</el-button>
    </div>
    <el-table :data="items" border stripe :empty-text="$t('communication.empty')" class="communication-table">
      <el-table-column type="index" :label="$t('common.seq')" width="68" fixed="left" align="center" />
      <el-table-column prop="communicate_time" :label="$t('communication.time')" min-width="180"><template #default="{ row }">{{ row.communicate_time || '--' }}</template></el-table-column>
      <el-table-column prop="communicate_content" :label="$t('communication.content')" min-width="520"><template #default="{ row }"><TableOverflowText :value="row.communicate_content" /></template></el-table-column>
      <el-table-column :label="$t('common.action')" width="132" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEditor(row)">{{ $t('common.edit') }}</el-button>
          <el-popconfirm :title="$t('communication.deleteConfirm')" :confirm-button-text="$t('common.delete')" :cancel-button-text="$t('common.cancel')" @confirm="remove(row.id)">
            <template #reference><el-button link type="danger">{{ $t('common.delete') }}</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <el-dialog v-model="editorVisible" :title="form.id ? $t('communication.edit') : $t('communication.add')" width="560px" append-to-body>
    <el-form :model="form" label-width="90px">
      <el-form-item :label="$t('communication.time')">
        <el-date-picker v-model="form.communicate_time" type="datetime" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" :placeholder="$t('communication.placeholderTime')" style="width:100%" />
      </el-form-item>
      <el-form-item :label="$t('communication.content')">
        <el-input v-model="form.communicate_content" type="textarea" :rows="7" :placeholder="$t('communication.placeholderContent')" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editorVisible=false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="saving" @click="save">{{ $t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { candidateApi } from '@/api/candidateApi';
import TableOverflowText from './TableOverflowText.vue';

const props = defineProps({ candidateId: { type: Number, required: true }, items: { type: Array, default: () => [] } });
const emit = defineEmits(['saved']);
const { t } = useI18n();

const editorVisible = ref(false);
const saving = ref(false);
const form = reactive({});

const localDateTime = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const reset = () => {
  Object.keys(form).forEach((key) => delete form[key]);
  Object.assign(form, { communicate_time: localDateTime(), communicate_content: '' });
};

const openEditor = (item) => {
  reset();
  if (item) Object.assign(form, item);
  editorVisible.value = true;
};

const save = async () => {
  saving.value = true;
  try {
    const payload = { ...form };
    if (form.id) await candidateApi.candidateCommunicationUpdate(props.candidateId, form.id, payload);
    else await candidateApi.candidateCommunicationAdd(props.candidateId, payload);
    ElMessage.success(t('communication.saved'));
    editorVisible.value = false;
    emit('saved');
  } catch (e) {
    ElMessage.error(`${t('common.saveFailed')}: ${e.message}`);
  } finally {
    saving.value = false;
  }
};

const remove = async (id) => {
  try {
    await candidateApi.candidateCommunicationDelete(props.candidateId, id);
    ElMessage.success(t('communication.deleted'));
    emit('saved');
  } catch (e) {
    ElMessage.error(`${t('common.deleteFailed')}: ${e.message}`);
  }
};
</script>

<style scoped lang="less">
.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  h3 { margin: 0; color: #17365d; }
}
.communication-table {
  width: 100%;
  border-radius: 9px;
  overflow: hidden;
  :deep(.el-table__header th) { background: #eaf3ff; color: #24486c; font-weight: 700; }
  :deep(.el-table__cell) { padding: 11px 0; }
  :deep(.el-button) { font-size: 14px; font-weight: 600; }
}
</style>
