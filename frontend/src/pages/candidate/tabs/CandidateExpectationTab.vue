<template>
  <section class="candidate-tab">
    <div class="section-toolbar">
      <div>
        <h3>{{ $t('expectations.title') }}</h3>
        <p>{{ $t('expectations.count', { count: items.length }) }}</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">{{ $t('expectations.add') }}</el-button>
    </div>

    <el-table :data="items" border stripe :empty-text="$t('common.noData')" class="expectation-table">
      <el-table-column type="index" :label="$t('common.seq')" width="68" fixed="left" align="center" />
      <el-table-column prop="expected_city" :label="$t('expectations.city')" min-width="120"><template #default="{ row }">{{ show(row.expected_city) }}</template></el-table-column>
      <el-table-column prop="expected_position" :label="$t('expectations.position')" min-width="150"><template #default="{ row }">{{ show(row.expected_position) }}</template></el-table-column>
      <el-table-column prop="expected_salary" :label="$t('expectations.salaryMonth')" min-width="130"><template #default="{ row }">{{ show(row.expected_salary) }}</template></el-table-column>
      <el-table-column prop="expected_annual_salary_min" :label="$t('expectations.salaryMin')" min-width="130"><template #default="{ row }">{{ show(row.expected_annual_salary_min) }}</template></el-table-column>
      <el-table-column prop="expected_annual_salary_max" :label="$t('expectations.salaryMax')" min-width="130"><template #default="{ row }">{{ show(row.expected_annual_salary_max) }}</template></el-table-column>
      <el-table-column prop="expected_industry" :label="$t('expectations.industry')" min-width="150"><template #default="{ row }">{{ show(row.expected_industry) }}</template></el-table-column>
      <el-table-column prop="expected_employment_type" :label="$t('expectations.employmentType')" min-width="110"><template #default="{ row }">{{ formatEmploymentType(row.expected_employment_type) }}</template></el-table-column>
      <el-table-column prop="expected_start_date" :label="$t('expectations.startDate')" min-width="120"><template #default="{ row }">{{ show(row.expected_start_date) }}</template></el-table-column>
      <el-table-column :label="$t('common.action')" width="132" fixed="right" align="center">
        <template #default="{ row, $index }">
          <el-button type="primary" link @click="openEdit(row, $index)">{{ $t('common.edit') }}</el-button>
          <el-popconfirm :title="$t('expectations.deleteConfirm')" :confirm-button-text="$t('common.delete')" :cancel-button-text="$t('common.cancel')" @confirm="remove($index)">
            <template #reference><el-button type="danger" link>{{ $t('common.delete') }}</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <el-dialog v-model="editorVisible" class="expectation-editor-dialog" :title="editorTitle" width="760px" append-to-body>
    <el-form :model="form" label-width="110px">
      <el-row :gutter="18">
        <el-col :span="12"><el-form-item :label="$t('expectations.city')"><el-input v-model="form.expected_city" clearable :placeholder="$t('expectations.placeholderCity')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('expectations.salaryMonth')"><el-input v-model="form.expected_salary" clearable :placeholder="$t('expectations.placeholderSalary')" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item :label="$t('expectations.position')"><el-input v-model="form.expected_position" clearable :placeholder="$t('expectations.placeholderPosition')" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item :label="$t('expectations.industry')"><el-input v-model="form.expected_industry" clearable :placeholder="$t('expectations.placeholderIndustry')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('expectations.salaryMin')"><el-input-number v-model="form.expected_annual_salary_min" :min="0" controls-position="right" :placeholder="$t('common.inputPlaceholder')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('expectations.salaryMax')"><el-input-number v-model="form.expected_annual_salary_max" :min="0" controls-position="right" :placeholder="$t('common.inputPlaceholder')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('expectations.employmentType')"><el-select v-model="form.expected_employment_type" filterable allow-create default-first-option clearable :placeholder="$t('common.selectPlaceholder')"><el-option v-for="item in employmentOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('expectations.startDate')"><el-input v-model="form.expected_start_date" clearable :placeholder="$t('expectations.placeholderStartDate')" /></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="editorVisible=false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="saving" @click="save">{{ $t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { candidateApi } from '@/api/candidateApi';

const props = defineProps({
  candidateId: { type: Number, required: true },
  resumeId: { type: Number, required: true },
  items: { type: Array, default: () => [] },
});
const emit = defineEmits(['saved']);
const { t } = useI18n();

const fields = [
  'expected_city', 'expected_position', 'expected_salary', 'expected_annual_salary_min',
  'expected_annual_salary_max', 'expected_industry', 'expected_employment_type', 'expected_start_date',
];
const employmentOptions = computed(() => [
  { label: t('options.employmentType.fullTime'), value: '全职' },
  { label: t('options.employmentType.partTime'), value: '兼职' },
  { label: t('options.employmentType.internship'), value: '实习' },
  { label: t('options.employmentType.remote'), value: '远程办公' },
  { label: t('options.employmentType.hybrid'), value: '混合办公' },
]);
const formatEmploymentType = (val) => {
  const match = employmentOptions.value.find((item) => item.value === val);
  return match ? match.label : show(val);
};
const editorVisible = ref(false);
const editingIndex = ref(-1);
const saving = ref(false);
const form = reactive({});
const editorTitle = computed(() => editingIndex.value < 0 ? t('expectations.add') : t('expectations.edit'));
const show = (value) => value === null || value === undefined || value === '' ? '--' : value;
const cleanRow = (row = {}) => Object.fromEntries(fields.map((field) => [field, row[field] ?? '']));
const fillForm = (row) => {
  Object.keys(form).forEach((key) => delete form[key]);
  Object.assign(form, cleanRow(row));
};
const openCreate = () => {
  editingIndex.value = -1;
  fillForm();
  editorVisible.value = true;
};
const openEdit = (row, index) => {
  editingIndex.value = index;
  fillForm(row);
  editorVisible.value = true;
};
const save = async () => {
  saving.value = true;
  try {
    const nextItems = props.items.map(cleanRow);
    if (editingIndex.value < 0) nextItems.push(cleanRow(form));
    else nextItems.splice(editingIndex.value, 1, cleanRow(form));
    await candidateApi.candidateResumeExpectationsUpdate(props.candidateId, props.resumeId, nextItems);
    ElMessage.success(t('expectations.saved'));
    editorVisible.value = false;
    emit('saved');
  } catch (error) {
    ElMessage.error(`${t('common.saveFailed')}: ${error.message}`);
  } finally {
    saving.value = false;
  }
};
const remove = async (index) => {
  try {
    const nextItems = props.items.map(cleanRow);
    nextItems.splice(index, 1);
    await candidateApi.candidateResumeExpectationsUpdate(props.candidateId, props.resumeId, nextItems);
    ElMessage.success(t('expectations.deleted'));
    emit('saved');
  } catch (error) {
    ElMessage.error(`${t('common.deleteFailed')}: ${error.message}`);
  }
};
</script>

<style scoped lang="less">
.section-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;h3{margin:0;color:#17365d;font-size:17px}p{margin:5px 0 0;color:#718096;font-size:13px}}
.expectation-table{width:100%;border-radius:9px;overflow:hidden;:deep(.el-table__header th){background:#eaf3ff;color:#24486c;font-weight:700}:deep(.el-table__cell){padding:11px 0}:deep(.el-button){font-size:14px;font-weight:600}}
:global(.expectation-editor-dialog.el-dialog){overflow:hidden;border:1px solid #dbeafe;border-radius:13px;background:#fff;box-shadow:0 24px 70px rgba(30,64,175,.2)}
:global(.expectation-editor-dialog .el-dialog__header){margin:0;padding:20px 24px;background:linear-gradient(135deg,#eff6ff,#fff);border-bottom:1px solid #dbeafe}
:global(.expectation-editor-dialog .el-dialog__title){color:#17365d;font-size:18px;font-weight:700}
:global(.expectation-editor-dialog .el-dialog__body){padding:22px 24px 8px}
:global(.expectation-editor-dialog .el-form){padding:20px 18px 2px;border:1px solid #e1ebf7;border-radius:11px;background:#fbfdff}
:global(.expectation-editor-dialog .el-form-item__label){color:#294663;font-weight:600}
:global(.expectation-editor-dialog .el-input-number),:global(.expectation-editor-dialog .el-select){width:100%}
:global(.expectation-editor-dialog .el-dialog__footer){padding:16px 24px 18px;background:#f7fbff;border-top:1px solid #e1ebf7}
</style>
