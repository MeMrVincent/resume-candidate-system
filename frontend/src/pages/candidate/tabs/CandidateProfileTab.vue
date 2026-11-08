<template>
  <section class="candidate-tab">
    <div class="section-toolbar">
      <h3>{{ $t('profile.title') }}</h3>
      <el-button type="primary" plain :icon="Edit" @click="openBaseEditor">{{ $t('profile.edit') }}</el-button>
    </div>

    <el-descriptions :column="2" border size="small" class="base-table">
      <el-descriptions-item v-for="field in baseFields" :key="field.label" :label="field.label" :span="field.span || 1">
        {{ field.value }}
      </el-descriptions-item>
    </el-descriptions>

  </section>

  <el-dialog v-model="baseEditorVisible" class="base-info-editor-dialog" :title="$t('profile.edit')" width="900px" append-to-body>
    <el-form :model="baseForm" label-width="110px">
      <el-row :gutter="16">
        <el-col :span="12"><el-form-item :label="$t('profile.fullName')"><el-input v-model="baseForm.full_name" clearable :placeholder="$t('profile.inputName')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.gender')"><el-select v-model="baseForm.gender" clearable :placeholder="$t('profile.selectGender')"><el-option v-for="item in genderOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.age')"><el-input v-model="baseForm.age" disabled :placeholder="$t('profile.autoAge')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.birthDate')"><el-date-picker v-model="baseForm.birth_date" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD" clearable :placeholder="$t('profile.selectBirthDate')" :disabled-date="disableFutureDate" @change="handleBirthDateChange" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.birthYear')"><el-input v-model="baseForm.birth_year" disabled :placeholder="$t('profile.autoBirthYear')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.maritalStatus')"><el-select v-model="baseForm.marital_status" clearable :placeholder="$t('profile.selectMarital')"><el-option v-for="item in maritalOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.childrenStatus')"><el-select v-model="baseForm.children_status" clearable :placeholder="$t('profile.selectChildren')"><el-option v-for="item in childrenOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.politicalStatus')"><el-select v-model="baseForm.political_status" clearable :placeholder="$t('profile.selectPolitical')"><el-option v-for="item in politicalOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
        <el-col :span="6"><el-form-item :label="$t('profile.height') + ' (cm)'"><el-input-number v-model="baseForm.height_cm" :min="0" :max="250" controls-position="right" :placeholder="$t('profile.height')" /></el-form-item></el-col>
        <el-col :span="6"><el-form-item :label="$t('profile.weight') + ' (kg)'"><el-input-number v-model="baseForm.weight_kg" :min="0" :max="300" controls-position="right" :placeholder="$t('profile.weight')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.household')"><el-input v-model="baseForm.household_registration" clearable :placeholder="$t('profile.inputHousehold')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.city')"><el-input v-model="baseForm.city" clearable :placeholder="$t('profile.inputCity')" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item :label="$t('profile.address')"><el-input v-model="baseForm.address" clearable :placeholder="$t('profile.inputAddress')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.postalCode')"><el-input v-model="baseForm.postal_code" clearable maxlength="12" :placeholder="$t('profile.inputPostal')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.nationality')"><el-select v-model="baseForm.nationality" filterable allow-create default-first-option clearable :placeholder="$t('profile.selectNationality')"><el-option v-for="item in nationalityOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.sourcePlatform')"><el-select v-model="baseForm.platform_from" filterable allow-create default-first-option clearable :placeholder="$t('profile.selectPlatform')"><el-option v-for="item in platformOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.platformResumeId')"><el-input v-model="baseForm.platform_resume_id" clearable :placeholder="$t('profile.inputPlatformResumeId')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.phone')"><el-input v-model="baseForm.phone" clearable :placeholder="$t('profile.inputPhone')" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item :label="$t('profile.email')"><el-input v-model="baseForm.email" clearable :placeholder="$t('profile.inputEmail')" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item :label="$t('profile.pr')"><el-input v-model="baseForm.pr" type="textarea" :rows="5" maxlength="3000" show-word-limit :placeholder="$t('profile.inputPr')" /></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer><el-button @click="baseEditorVisible=false">{{ $t('common.cancel') }}</el-button><el-button type="primary" :loading="savingBase" @click="saveBase">{{ $t('common.save') }}</el-button></template>
  </el-dialog>

</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Edit } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { candidateApi } from '@/api/candidateApi';

const props = defineProps({ candidateId: { type: Number, required: true }, resumeId: { type: Number, required: true }, detail: { type: Object, required: true } });
const emit = defineEmits(['saved']);
const { t } = useI18n();

const profile = computed(() => props.detail.profile || {});
const candidate = computed(() => props.detail.candidate || {});
const baseEditorVisible = ref(false);
const savingBase = ref(false);
const baseForm = reactive({});
const baseInfoKeys = [
  'full_name', 'gender', 'age', 'birth_date', 'birth_year', 'marital_status', 'children_status',
  'political_status', 'height_cm', 'weight_kg', 'household_registration', 'address', 'postal_code',
  'platform_from', 'platform_resume_id', 'phone', 'email', 'city', 'nationality', 'pr',
];

const genderOptions = computed(() => [
  { label: t('options.gender.male'), value: '男' },
  { label: t('options.gender.female'), value: '女' },
  { label: t('options.gender.other'), value: '其他' },
  { label: t('options.gender.confidential'), value: '保密' },
]);
const maritalOptions = computed(() => [
  { label: t('options.marital.unmarried'), value: '未婚' },
  { label: t('options.marital.married'), value: '已婚' },
  { label: t('options.marital.divorced'), value: '离异' },
  { label: t('options.marital.widowed'), value: '丧偶' },
  { label: t('options.marital.confidential'), value: '保密' },
]);
const childrenOptions = computed(() => [
  { label: t('options.children.unborn'), value: '未育' },
  { label: t('options.children.born'), value: '已育' },
  { label: t('options.children.none'), value: '无子女' },
  { label: t('options.children.has'), value: '有子女' },
  { label: t('options.children.confidential'), value: '保密' },
]);
const politicalOptions = computed(() => [
  { label: t('options.political.partyMember'), value: '中共党员' },
  { label: t('options.political.leagueMember'), value: '共青团员' },
  { label: t('options.political.masses'), value: '群众' },
  { label: t('options.political.democraticParty'), value: '民主党派' },
  { label: t('options.political.nonPartisan'), value: '无党派人士' },
  { label: t('options.political.other'), value: '其他' },
]);
const nationalityOptions = computed(() => [
  { label: t('options.nationality.china'), value: '中国' },
  { label: t('options.nationality.japan'), value: '日本' },
  { label: t('options.nationality.korea'), value: '韩国' },
  { label: t('options.nationality.usa'), value: '美国' },
  { label: t('options.nationality.uk'), value: '英国' },
  { label: t('options.nationality.germany'), value: '德国' },
  { label: t('options.nationality.france'), value: '法国' },
  { label: t('options.nationality.india'), value: '印度' },
  { label: t('options.nationality.other'), value: '其他' },
]);
const platformOptions = computed(() => [
  { label: t('options.platforms.zhaopin'), value: '智联招聘' },
  { label: t('options.platforms.51job'), value: '前程无忧(51job)' },
  { label: t('options.platforms.liepin'), value: '猎聘网' },
  { label: t('options.platforms.otherHtml'), value: '其他HTML简历' },
  { label: t('options.platforms.excel'), value: 'Excel多工作表简历' },
  { label: t('options.platforms.userUpload'), value: '用户上传' },
]);

const formatOption = (val, list) => {
  const match = list.value.find((item) => item.value === val);
  return match ? match.label : show(val);
};

const show = (value, suffix = '') => value === null || value === undefined || value === '' ? '--' : `${value}${suffix}`;
const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').replace(/([+-]\d{2}:?\d{2}|Z)$/, '');
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
const normalizeBirthDate = (value) => {
  const text = String(value || '').trim();
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  const values = compact ? compact.slice(1) : text.match(/\d+/g);
  if (!values || values.length < 3) return text;
  const [year, month, day] = values.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return text;
  const pad = (item) => String(item).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
};
const disableFutureDate = (date) => date.getTime() > Date.now();
const calculateAgeValue = (source) => {
  const values = String(source.birth_date || '').match(/\d+/g) || [];
  const year = Number(values[0] || source.birth_year); if (!year) return null;
  const month = Number(values[1] || 1); const day = Number(values[2] || 1); const now = new Date(); let age = now.getFullYear() - year;
  if (now.getMonth()+1 < month || (now.getMonth()+1 === month && now.getDate() < day)) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
};
const calculateAge = () => show(calculateAgeValue(profile.value), t('common.ageUnit'));
const handleBirthDateChange = (value) => {
  if (!value) {
    baseForm.birth_year = null;
    baseForm.age = null;
    return;
  }
  baseForm.birth_year = Number(String(value).slice(0, 4));
  baseForm.age = calculateAgeValue(baseForm);
};

const baseFields = computed(() => [
  { label: t('profile.fullName'), value: show(profile.value.full_name) },
  { label: t('profile.gender'), value: formatOption(profile.value.gender, genderOptions) },
  { label: t('profile.age'), value: calculateAge() },
  { label: t('profile.birthDate'), value: show(profile.value.birth_date) },
  { label: t('profile.birthYear'), value: show(profile.value.birth_year) },
  { label: t('profile.maritalStatus'), value: formatOption(profile.value.marital_status, maritalOptions) },
  { label: t('profile.childrenStatus'), value: formatOption(profile.value.children_status, childrenOptions) },
  { label: t('profile.politicalStatus'), value: formatOption(profile.value.political_status, politicalOptions) },
  { label: t('profile.height'), value: show(profile.value.height_cm, ' cm') },
  { label: t('profile.weight'), value: show(profile.value.weight_kg, ' kg') },
  { label: t('profile.household'), value: show(profile.value.household_registration) },
  { label: t('profile.city'), value: show(profile.value.city) },
  { label: t('profile.address'), value: show(profile.value.address), span: 2 },
  { label: t('profile.postalCode'), value: show(profile.value.postal_code) },
  { label: t('profile.nationality'), value: formatOption(profile.value.nationality, nationalityOptions) },
  { label: t('profile.sourcePlatform'), value: formatOption(profile.value.platform_from, platformOptions) },
  { label: t('profile.platformResumeId'), value: show(profile.value.platform_resume_id) },
  { label: t('profile.phone'), value: show(profile.value.phone) },
  { label: t('profile.email'), value: show(profile.value.email) },
  { label: t('profile.resumeDownloadDate'), value: formatDateTime(profile.value.resume_download_date) },
  { label: t('profile.resumeUpdatedDate'), value: formatDateTime(profile.value.resume_updated_date) },
  { label: t('profile.sysCreatedDate'), value: formatDateTime(candidate.value.sys_created_date) },
  { label: t('profile.sysUpdatedDate'), value: formatDateTime(candidate.value.sys_updated_date) },
  { label: t('profile.pr'), value: show(profile.value.pr), span: 2 },
]);

const openBaseEditor = () => {
  Object.keys(baseForm).forEach((key) => delete baseForm[key]);
  for (const key of baseInfoKeys) baseForm[key] = profile.value[key] ?? '';
  baseForm.birth_date = normalizeBirthDate(baseForm.birth_date);
  const normalizedYear = String(baseForm.birth_date).match(/^\d{4}/)?.[0];
  if (normalizedYear) baseForm.birth_year = Number(normalizedYear);
  baseForm.age = calculateAgeValue(baseForm);
  baseEditorVisible.value = true;
};

const saveBase = async () => {
  savingBase.value = true;
  try {
    baseForm.birth_date = normalizeBirthDate(baseForm.birth_date);
    const normalizedYear = String(baseForm.birth_date).match(/^\d{4}/)?.[0];
    if (normalizedYear) baseForm.birth_year = Number(normalizedYear);
    baseForm.age = calculateAgeValue(baseForm);
    const payload = Object.fromEntries(baseInfoKeys.map((key) => [key, baseForm[key]]));
    await candidateApi.candidateResumeBaseInfoUpdate(props.candidateId, props.resumeId, payload);
    ElMessage.success(t('profile.saved'));
    baseEditorVisible.value = false;
    emit('saved');
  } catch (e) {
    ElMessage.error(`${t('profile.saveFailed')}: ${e.message}`);
  } finally {
    savingBase.value = false;
  }
};
</script>

<style scoped lang="less">
.section-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;h3{margin:0;font-size:16px;color:#1e293b}}.base-table :deep(.el-descriptions__label){width:130px;background:#eaf2fb!important;color:#1e3a5f!important;font-weight:700}.base-table :deep(.el-descriptions__content){color:#334155;white-space:pre-wrap}.el-select,.el-input-number,.el-date-editor{width:100%}

:global(.base-info-editor-dialog.el-dialog){overflow:hidden;border:1px solid #dbeafe;border-radius:14px;background:#fff;box-shadow:0 24px 70px rgba(30,64,175,.2)}
:global(.base-info-editor-dialog .el-dialog__header){margin:0;padding:20px 24px;background:linear-gradient(135deg,#eff6ff 0%,#f8fbff 55%,#fff 100%);border-bottom:1px solid #dbeafe}
:global(.base-info-editor-dialog .el-dialog__title){color:#17365d;font-size:19px;font-weight:700;letter-spacing:.2px}
:global(.base-info-editor-dialog .el-dialog__headerbtn){top:4px;right:8px;width:48px;height:48px}
:global(.base-info-editor-dialog .el-dialog__headerbtn .el-dialog__close){color:#5b7391;font-size:18px}
:global(.base-info-editor-dialog .el-dialog__body){padding:22px 24px 10px;background:#fff}
:global(.base-info-editor-dialog .el-form){padding:20px 20px 4px;border:1px solid #e1ebf7;border-radius:12px;background:linear-gradient(180deg,#fbfdff 0%,#fff 100%)}
:global(.base-info-editor-dialog .el-form-item){margin-bottom:18px}
:global(.base-info-editor-dialog .el-form-item__label){color:#294663;font-weight:600}
:global(.base-info-editor-dialog .el-date-editor.el-input),:global(.base-info-editor-dialog .el-date-editor.el-input__wrapper){width:100%}
:global(.base-info-editor-dialog .el-input__wrapper),:global(.base-info-editor-dialog .el-select__wrapper),:global(.base-info-editor-dialog .el-textarea__inner){background:#fff;box-shadow:0 0 0 1px #cbdbee inset;transition:box-shadow .2s ease,background .2s ease}
:global(.base-info-editor-dialog .el-input__wrapper:hover),:global(.base-info-editor-dialog .el-select__wrapper:hover),:global(.base-info-editor-dialog .el-textarea__inner:hover){box-shadow:0 0 0 1px #79aef8 inset}
:global(.base-info-editor-dialog .el-input__wrapper.is-focus),:global(.base-info-editor-dialog .el-select__wrapper.is-focused),:global(.base-info-editor-dialog .el-textarea__inner:focus){box-shadow:0 0 0 1px #3b82f6 inset,0 0 0 3px rgba(59,130,246,.1)}
:global(.base-info-editor-dialog .is-disabled .el-input__wrapper){background:#eef6ff;box-shadow:0 0 0 1px #d5e6fa inset}
:global(.base-info-editor-dialog .is-disabled .el-input__inner){color:#526b85;-webkit-text-fill-color:#526b85}
:global(.base-info-editor-dialog .el-textarea__inner){min-height:112px!important;padding:12px 14px;line-height:1.65}
:global(.base-info-editor-dialog .el-dialog__footer){padding:16px 24px 18px;background:#f7fbff;border-top:1px solid #e1ebf7}
:global(.base-info-editor-dialog .el-dialog__footer .el-button){min-width:76px;height:36px;border-radius:7px;font-weight:600}
:global(.base-info-editor-dialog .el-dialog__footer .el-button--primary){box-shadow:0 6px 14px rgba(59,130,246,.22)}
</style>
