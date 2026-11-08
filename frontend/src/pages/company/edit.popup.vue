<template>
  <el-dialog v-model="popup.show" :title="popup.title" width="640px" center align-center>
    <el-form ref="formRef" :model="popup.data" :rules="formRules" label-width="100px">
      <el-form-item :label="proxy.$t('company.companyName')" prop="company_name">
        <el-input v-model="popup.data.company_name" />
      </el-form-item>
      <el-form-item :label="proxy.$t('company.shortName')">
        <el-input v-model="popup.data.short_name" />
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item :label="proxy.$t('company.industry')"><el-input v-model="popup.data.industry" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="proxy.$t('company.companySize')"><el-input v-model="popup.data.company_size" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="proxy.$t('company.city')"><el-input v-model="popup.data.city" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="proxy.$t('lan.status')">
            <el-select v-model="popup.data.status">
              <el-option v-for="status in companyStatusList" :key="status" :label="proxy.$t(`company.status.${status}`)" :value="status" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="proxy.$t('company.website')"><el-input v-model="popup.data.website" /></el-form-item>
      <el-form-item :label="proxy.$t('company.address')"><el-input v-model="popup.data.address" /></el-form-item>
      <el-form-item :label="proxy.$t('company.description')">
        <el-input v-model="popup.data.description" type="textarea" :rows="4" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button round @click="popup.show = false">{{ proxy.$t("btn.cancel") }}</el-button>
      <el-button round type="success" :loading="popup.isSubmitting" @click="handleSubmitClick">{{ proxy.$t("btn.save") }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, getCurrentInstance } from "vue";
import { ElMessage } from "element-plus";

const emit = defineEmits(["callback"]);
const { proxy } = getCurrentInstance();

const companyStatusList = ["active", "inactive", "blacklisted"];
const formRef = ref(null);
const popup = reactive({ show: false, type: "create", title: "", isSubmitting: false, companyId: null, data: {} });
const formRules = {
  company_name: [{ required: true, message: () => proxy.$t("lan.input"), trigger: "blur" }]
};

const createEmptyCompanyForm = () => ({
  company_name: "",
  short_name: "",
  industry: "",
  company_size: "",
  city: "",
  website: "",
  address: "",
  description: "",
  status: "active"
});

/**
 * 打开弹窗，供列表页调用
 * Opens the dialog; called by the list page
 * ダイアログを開く。一覧ページから呼ばれる
 * @param {"create"|"edit"} popupType 新建或编辑 | Create or edit | 新規作成または編集
 * @param {object} companyRow 编辑时传入列表行 | The list row, passed when editing | 編集時に渡す一覧の行
 */
const open = (popupType, companyRow) => {
  popup.type = popupType;
  popup.companyId = companyRow ? companyRow.id : null;
  popup.title = proxy.$t(popupType === "create" ? "company.createCompany" : "company.editCompany");
  popup.data = popupType === "create" ? createEmptyCompanyForm() : { ...createEmptyCompanyForm(), ...pickEditableFields(companyRow) };
  popup.show = true;
};

const pickEditableFields = companyRow => {
  const editableFields = {};
  for (const fieldName of Object.keys(createEmptyCompanyForm())) editableFields[fieldName] = companyRow[fieldName];
  return editableFields;
};

const handleSubmitClick = async () => {
  const isFormValid = await formRef.value.validate().catch(() => false);
  if (!isFormValid) return;
  popup.isSubmitting = true;
  const res =
    popup.type === "create" ? await proxy.$API.companyCreate(popup.data) : await proxy.$API.companyUpdate(popup.companyId, popup.data);
  popup.isSubmitting = false;
  if (res.code === 0) {
    ElMessage.success(proxy.$t("message.saveSuccess"));
    popup.show = false;
    emit("callback");
  }
};

defineExpose({ open });
</script>
