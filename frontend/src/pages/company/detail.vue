<template>
  <div class="CompanyDetail" v-loading="isLoading">
    <div class="detailHeader">
      <el-button round @click="handleBackClick">{{ proxy.$t("btn.back") }}</el-button>
      <span class="companyTitle">{{ company.company_name }}</span>
      <el-tag :type="company.status === 'active' ? 'success' : 'info'" size="small">
        {{ company.status ? proxy.$t(`company.status.${company.status}`) : "" }}
      </el-tag>
    </div>

    <!-- 基本信息与公司介绍 | Basic info and company introduction | 基本情報と企業紹介 -->
    <el-card shadow="never" class="sectionCard">
      <template #header>{{ proxy.$t("company.basicInfo") }}</template>
      <el-descriptions :column="3" border>
        <el-descriptions-item :label="proxy.$t('company.shortName')">{{ company.short_name || proxy.$t("lan.none") }}</el-descriptions-item>
        <el-descriptions-item :label="proxy.$t('company.industry')">{{ company.industry || proxy.$t("lan.none") }}</el-descriptions-item>
        <el-descriptions-item :label="proxy.$t('company.companySize')">{{ company.company_size || proxy.$t("lan.none") }}</el-descriptions-item>
        <el-descriptions-item :label="proxy.$t('company.city')">{{ company.city || proxy.$t("lan.none") }}</el-descriptions-item>
        <el-descriptions-item :label="proxy.$t('company.website')">{{ company.website || proxy.$t("lan.none") }}</el-descriptions-item>
        <el-descriptions-item :label="proxy.$t('company.positionOpen')">{{ company.position_open }} / {{ company.position_total }}</el-descriptions-item>
        <el-descriptions-item :label="proxy.$t('company.address')" :span="3">{{ company.address || proxy.$t("lan.none") }}</el-descriptions-item>
        <el-descriptions-item :label="proxy.$t('company.description')" :span="3">
          <div class="descriptionText">{{ company.description || proxy.$t("lan.none") }}</div>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 对接人 | Contacts | 担当者 -->
    <el-card shadow="never" class="sectionCard">
      <template #header>
        <div class="cardHeader">
          <span>{{ proxy.$t("company.contacts") }}</span>
          <el-button type="primary" size="small" round @click="handleAddContactClick">{{ proxy.$t("company.addContact") }}</el-button>
        </div>
      </template>
      <el-table :data="company.contacts" :empty-text="proxy.$t('lan.empty')">
        <el-table-column prop="contact_name" :label="proxy.$t('company.contactName')" min-width="120">
          <template #default="scope">
            {{ scope.row.contact_name }}
            <el-tag v-if="scope.row.is_primary" size="small" type="warning">{{ proxy.$t("company.primaryTag") }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" :label="proxy.$t('company.contactTitle')" min-width="120" />
        <el-table-column prop="department" :label="proxy.$t('company.department')" min-width="120" />
        <el-table-column prop="phone" :label="proxy.$t('company.phone')" min-width="140" />
        <el-table-column prop="email" :label="proxy.$t('company.email')" min-width="180" />
        <el-table-column prop="wechat" :label="proxy.$t('company.wechat')" min-width="120" />
        <el-table-column prop="position_count" :label="proxy.$t('company.positionCount')" width="100" />
        <el-table-column prop="status" :label="proxy.$t('lan.status')" width="100">
          <template #default="scope">{{ proxy.$t(`company.contactStatus.${scope.row.status}`) }}</template>
        </el-table-column>
        <el-table-column :label="proxy.$t('lan.operate')" width="140" align="center">
          <template #default="scope">
            <el-button link type="primary" size="small" @click="handleEditContactClick(scope.row)">{{ proxy.$t("btn.edit") }}</el-button>
            <el-button link type="danger" size="small" @click="handleDeleteContactClick(scope.row)">{{ proxy.$t("btn.delete") }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 跟进备注 | Follow-up notes | フォローメモ -->
    <el-card shadow="never" class="sectionCard">
      <template #header>{{ proxy.$t("company.notes") }}</template>
      <div class="noteInput">
        <el-input v-model="newNoteContent" type="textarea" :rows="2" :placeholder="proxy.$t('company.noteContent')" />
        <el-button type="primary" round :disabled="!newNoteContent.trim()" @click="handleAddNoteClick">{{ proxy.$t("company.addNote") }}</el-button>
      </div>
      <el-timeline>
        <el-timeline-item v-for="note in company.notes" :key="note.id" :timestamp="note.noted_at.slice(0, 19).replace('T', ' ')">
          <div class="noteRow">
            <span class="descriptionText">{{ note.content }}</span>
            <el-button link type="danger" size="small" @click="handleDeleteNoteClick(note)">{{ proxy.$t("btn.delete") }}</el-button>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <contact-popup ref="contactPopupRef" @callback="loadCompanyDetail" />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, getCurrentInstance } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import ContactPopup from "./contact.popup.vue";

const { proxy } = getCurrentInstance();
const route = useRoute();
const router = useRouter();

const companyId = Number(route.params.companyId);
const isLoading = ref(false);
const company = reactive({ contacts: [], notes: [] });
const newNoteContent = ref("");
const contactPopupRef = ref(null);

onMounted(() => {
  loadCompanyDetail();
});

const loadCompanyDetail = async () => {
  isLoading.value = true;
  const res = await proxy.$API.companyGet(companyId);
  isLoading.value = false;
  if (res.code === 0) Object.assign(company, res.data);
};

const handleBackClick = () => router.push("/company");
const handleAddContactClick = () => contactPopupRef.value.open("create", companyId);
const handleEditContactClick = contactRow => contactPopupRef.value.open("edit", companyId, contactRow);

const confirmDelete = async () => {
  try {
    await ElMessageBox.confirm(proxy.$t("message.deleteConfirm"), proxy.$t("message.confirmTitle"), { type: "warning" });
    return true;
  } catch (cancelled) {
    return false;
  }
};

const handleDeleteContactClick = async contactRow => {
  if (!(await confirmDelete())) return;
  const res = await proxy.$API.companyContactDelete(contactRow.id);
  if (res.code === 0) {
    ElMessage.success(proxy.$t("message.deleteSuccess"));
    loadCompanyDetail();
  }
};

const handleAddNoteClick = async () => {
  const res = await proxy.$API.companyNoteAdd(companyId, { content: newNoteContent.value.trim() });
  if (res.code === 0) {
    newNoteContent.value = "";
    loadCompanyDetail();
  }
};

const handleDeleteNoteClick = async noteRow => {
  if (!(await confirmDelete())) return;
  const res = await proxy.$API.companyNoteDelete(noteRow.id);
  if (res.code === 0) loadCompanyDetail();
};
</script>

<style scoped lang="less">
.CompanyDetail {
  .detailHeader {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;

    .companyTitle {
      font-size: 18px;
      font-weight: 600;
    }
  }
  .sectionCard {
    margin-bottom: 12px;
  }
  .cardHeader,
  .noteRow {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .noteInput {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    margin-bottom: 16px;
  }
  .descriptionText {
    white-space: pre-wrap;
  }
}
</style>
