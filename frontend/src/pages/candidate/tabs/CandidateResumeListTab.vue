<template>
  <section class="candidate-list-tab">
    <div class="list-toolbar">
      <div><h3>{{ title }}</h3><p>{{ $t('common.recordsCount', { count: items.length }) }}</p></div>
      <el-button type="primary" :icon="Plus" @click="openCreate">{{ addLabel }}</el-button>
    </div>

    <el-table :data="items" border stripe :empty-text="$t('common.noData')" class="resume-list-table">
      <el-table-column type="index" :label="$t('common.seq')" width="68" fixed="left" align="center" />
      <el-table-column v-for="field in visibleFields" :key="field.key" :prop="field.key" :label="field.label" :min-width="field.minWidth || 120">
        <template #default="{ row }"><TableOverflowText :value="formatFieldValue(field, row[field.key])" /></template>
      </el-table-column>
      <el-table-column :label="$t('common.action')" width="132" fixed="right" align="center">
        <template #default="{ row, $index }">
          <el-button type="primary" link @click="openEdit(row, $index)">{{ $t('common.edit') }}</el-button>
          <el-popconfirm :title="$t('common.deleteConfirm')" :confirm-button-text="$t('common.delete')" :cancel-button-text="$t('common.cancel')" @confirm="remove($index)">
            <template #reference><el-button type="danger" link>{{ $t('common.delete') }}</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <el-dialog v-model="editorVisible" class="resume-list-editor-dialog" :title="editorTitle" :width="dialogWidth" append-to-body>
    <el-form :model="form" label-width="118px">
      <el-row :gutter="18">
        <el-col v-for="field in visibleFields" :key="field.key" :span="field.span || (field.type === 'textarea' ? 24 : 12)">
          <el-form-item :label="field.label">
            <el-input v-if="field.readonly" v-model="form[field.key]" disabled :placeholder="field.placeholder || t('common.inputPlaceholder')" />
            <el-input-number v-else-if="field.type === 'number'" v-model="form[field.key]" :min="field.min ?? 0" controls-position="right" :placeholder="field.placeholder || t('common.inputPlaceholder')" />
            <el-date-picker v-else-if="field.type === 'date' || field.type === 'month'" v-model="form[field.key]" :type="field.type" :format="dateFormat(field)" :value-format="dateValueFormat(field)" clearable :placeholder="field.placeholder || t('common.selectPlaceholder')" />
            <el-select v-else-if="field.type === 'select'" v-model="form[field.key]" filterable :allow-create="field.allowCreate !== false" default-first-option clearable :placeholder="field.placeholder || t('common.selectPlaceholder')" @change="handleFieldChange(field, $event)">
              <el-option v-for="option in field.options || []" :key="getOptionValue(option)" :label="getOptionLabel(option)" :value="getOptionValue(option)" />
            </el-select>
            <el-input v-else v-model="form[field.key]" :type="field.type === 'textarea' ? 'textarea' : 'text'" :rows="field.rows || 4" clearable :placeholder="field.placeholder || t('common.inputPlaceholder')" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer><el-button @click="editorVisible=false">{{ $t('common.cancel') }}</el-button><el-button type="primary" :loading="saving" @click="save">{{ $t('common.save') }}</el-button></template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { candidateApi } from '@/api/candidateApi';
import TableOverflowText from './TableOverflowText.vue';

const props = defineProps({
  candidateId: { type: Number, required: true }, resumeId: { type: Number, required: true },
  items: { type: Array, default: () => [] }, fields: { type: Array, required: true },
  title: { type: String, required: true }, addLabel: { type: String, required: true },
  updateMethod: { type: String, required: true }, dialogWidth: { type: String, default: '860px' },
});
const emit = defineEmits(['saved']);
const { t } = useI18n();
const editorVisible = ref(false); const editingIndex = ref(-1); const saving = ref(false); const form = reactive({});
const editorTitle = computed(() => editingIndex.value < 0 ? t('table.addRecord', { title: props.title }) : t('table.editRecord', { title: props.title }));
const visibleFields = computed(() => props.fields.filter((field) => field.key !== 'sequence_no'));
const getOptionValue = (option) => (typeof option === 'object' && option !== null ? option.value : option);
const getOptionLabel = (option) => (typeof option === 'object' && option !== null ? option.label : option);
const formatFieldValue = (field, value) => {
  if (field.type === 'select' && Array.isArray(field.options)) {
    const matched = field.options.find((opt) => getOptionValue(opt) === value);
    if (matched) return getOptionLabel(matched);
  }
  return value;
};
const dateFormat = (field) => field.format || (field.type === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');
const dateValueFormat = (field) => field.valueFormat || (field.type === 'month' ? 'YYYY-MM-01' : 'YYYY-MM-DD');
const cleanRow = (row = {}) => Object.fromEntries(props.fields.map((field) => [field.key, row[field.key] ?? '']));
const resequence = (rows) => rows.map((row, index) => Object.hasOwn(row, 'sequence_no') ? { ...row, sequence_no: index + 1 } : row);
const fillForm = (row = {}) => { Object.keys(form).forEach((key) => delete form[key]); Object.assign(form, cleanRow(row)); };
const handleFieldChange = (field, value) => { if (typeof field.onChange === 'function') field.onChange(form, value); };
const openCreate = () => { editingIndex.value = -1; fillForm(); if (Object.hasOwn(form, 'sequence_no')) form.sequence_no = props.items.length + 1; editorVisible.value = true; };
const openEdit = (row, index) => { editingIndex.value = index; fillForm(row); editorVisible.value = true; };
const persist = async (rows, successMessage) => {
  const method = candidateApi[props.updateMethod];
  if (typeof method !== 'function') throw new Error(`Unknown candidate API: ${props.updateMethod}`);
  await method(props.candidateId, props.resumeId, resequence(rows));
  ElMessage.success(successMessage); emit('saved');
};
const save = async () => { saving.value = true; try { const rows = props.items.map(cleanRow); if (editingIndex.value < 0) rows.push(cleanRow(form)); else rows.splice(editingIndex.value, 1, cleanRow(form)); await persist(rows, editingIndex.value < 0 ? t('table.recordAdded') : t('table.recordSaved')); editorVisible.value = false; } catch (error) { ElMessage.error(`${t('common.saveFailed')}: ${error.message}`); } finally { saving.value = false; } };
const remove = async (index) => { try { const rows = props.items.map(cleanRow); rows.splice(index, 1); await persist(rows, t('table.recordDeleted')); } catch (error) { ElMessage.error(`${t('common.deleteFailed')}: ${error.message}`); } };
</script>

<style scoped lang="less">
.list-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;h3{margin:0;color:#17365d;font-size:17px}p{margin:5px 0 0;color:#718096;font-size:13px}}
.resume-list-table{width:100%;border-radius:9px;overflow:hidden;:deep(.el-table__header th){background:#eaf3ff;color:#24486c;font-weight:700}:deep(.el-table__cell){padding:11px 0}:deep(.el-button){font-size:14px;font-weight:600}}
:global(.resume-list-editor-dialog.el-dialog){overflow:hidden;border:1px solid #dbeafe;border-radius:13px;background:#fff;box-shadow:0 24px 70px rgba(30,64,175,.2)}
:global(.resume-list-editor-dialog .el-dialog__header){margin:0;padding:20px 24px;background:linear-gradient(135deg,#eff6ff,#fff);border-bottom:1px solid #dbeafe}
:global(.resume-list-editor-dialog .el-dialog__title){color:#17365d;font-size:18px;font-weight:700}
:global(.resume-list-editor-dialog .el-dialog__body){padding:22px 24px 8px}
:global(.resume-list-editor-dialog .el-form){padding:20px 18px 2px;border:1px solid #e1ebf7;border-radius:11px;background:#fbfdff}
:global(.resume-list-editor-dialog .el-form-item__label){color:#294663;font-weight:600}
:global(.resume-list-editor-dialog .el-input-number),:global(.resume-list-editor-dialog .el-select),:global(.resume-list-editor-dialog .el-date-editor){width:100%}
:global(.resume-list-editor-dialog .el-dialog__footer){padding:16px 24px 18px;background:#f7fbff;border-top:1px solid #e1ebf7}
</style>
