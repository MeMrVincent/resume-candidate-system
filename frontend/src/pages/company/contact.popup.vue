<template>
  <el-dialog v-model="popup.show" :title="popup.title" width="520px" center align-center>
    <el-form ref="formRef" :model="popup.data" :rules="formRules" label-width="100px">
      <el-form-item :label="proxy.$t('company.contactName')" prop="contact_name"><el-input v-model="popup.data.contact_name" /></el-form-item>
      <el-form-item :label="proxy.$t('company.contactTitle')"><el-input v-model="popup.data.title" /></el-form-item>
      <el-form-item :label="proxy.$t('company.department')"><el-input v-model="popup.data.department" /></el-form-item>
      <el-form-item :label="proxy.$t('company.phone')"><el-input v-model="popup.data.phone" /></el-form-item>
      <el-form-item :label="proxy.$t('company.email')"><el-input v-model="popup.data.email" /></el-form-item>
      <el-form-item :label="proxy.$t('company.wechat')"><el-input v-model="popup.data.wechat" /></el-form-item>
      <el-form-item :label="proxy.$t('lan.status')">
        <el-select v-model="popup.data.status">
          <el-option v-for="status in contactStatusList" :key="status" :label="proxy.$t(`company.contactStatus.${status}`)" :value="status" />
        </el-select>
      </el-form-item>
      <el-form-item :label="proxy.$t('company.isPrimary')">
        <el-switch v-model="popup.data.is_primary" :active-value="1" :inactive-value="0" />
      </el-form-item>
      <el-form-item :label="proxy.$t('company.note')"><el-input v-model="popup.data.note" type="textarea" :rows="2" /></el-form-item>
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

const contactStatusList = ["active", "left"];
const formRef = ref(null);
const popup = reactive({ show: false, type: "create", title: "", isSubmitting: false, companyId: null, contactId: null, data: {} });
const formRules = {
  contact_name: [{ required: true, message: () => proxy.$t("lan.input"), trigger: "blur" }]
};

const createEmptyContactForm = () => ({
  contact_name: "",
  title: "",
  department: "",
  phone: "",
  email: "",
  wechat: "",
  status: "active",
  is_primary: 0,
  note: ""
});

/**
 * 打开弹窗，供公司详情页调用
 * Opens the dialog; called by the company detail page
 * ダイアログを開く。企業詳細ページから呼ばれる
 * @param {"create"|"edit"} popupType 新建或编辑 | Create or edit | 新規作成または編集
 * @param {number} companyId 所属公司 | The company it belongs to | 所属する企業
 * @param {object} contactRow 编辑时传入对接人行 | The contact row, passed when editing | 編集時に渡す担当者の行
 */
const open = (popupType, companyId, contactRow) => {
  popup.type = popupType;
  popup.companyId = companyId;
  popup.contactId = contactRow ? contactRow.id : null;
  popup.title = proxy.$t(popupType === "create" ? "company.addContact" : "company.editContact");
  const emptyForm = createEmptyContactForm();
  popup.data = { ...emptyForm };
  if (contactRow) for (const fieldName of Object.keys(emptyForm)) popup.data[fieldName] = contactRow[fieldName];
  popup.show = true;
};

const handleSubmitClick = async () => {
  const isFormValid = await formRef.value.validate().catch(() => false);
  if (!isFormValid) return;
  popup.isSubmitting = true;
  const res =
    popup.type === "create"
      ? await proxy.$API.companyContactAdd(popup.companyId, popup.data)
      : await proxy.$API.companyContactUpdate(popup.contactId, popup.data);
  popup.isSubmitting = false;
  if (res.code === 0) {
    ElMessage.success(proxy.$t("message.saveSuccess"));
    popup.show = false;
    emit("callback");
  }
};

defineExpose({ open });
</script>
