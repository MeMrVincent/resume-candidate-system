<template>
  <div class="wallet CRound wh100 MFlex">
    <!--code start-->
    <TonConnectButton :button-root-id="`ton-connect-button`" />
    <div class="Flex" style="margin:20px 0 0;">
      <template v-if="userFriendlyAddress && userInfo['wallet_address']">
        <el-button round type="primary" @click="handlePopup('open')">
          {{ proxy.$t('wallet.reCharge') }}
        </el-button>
        <el-button round type="danger" @click="handleAction('disconnect')">
          {{ proxy.$t('wallet.disconnect') }}
        </el-button>
      </template>
      <el-button round type="primary" plain>
        Modal state: {{ state?.status }}
      </el-button>
    </div>
    <!--code end-->

    <!-- popup-->
    <el-dialog v-model="popup.show" width="500" :title="proxy.$t('wallet.reCharge')" center class="CRound CHeader">
      <el-input v-model="popup.data.value" clearable :placeholder="proxy.$t('wallet.reCharge') + proxy.$t('wallet.amount')" type="number" @input="handlePopup('input')">
        <template #prepend>
          {{ proxy.$AppEnv.receiveCurrency }}
        </template>
      </el-input>
      <template #footer>
        <div class="dialog-footer Flex">
          <el-button @click="handlePopup('close')">
            {{ proxy.$t('btn.cancel') }}
          </el-button>
          <el-button type="danger" :disabled="JSON.stringify(popup.data) === JSON.stringify(popup.default)" @click="handlePopup('reset')">
            {{ proxy.$t('btn.reset') }}
          </el-button>
          <el-button type="primary" :disabled="JSON.stringify(popup.data) === JSON.stringify(popup.default)" @click="handlePopup('submit')">
            {{ proxy.$t('btn.confirm') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    <!-- popup-->
  </div>
</template>
<script setup>
import { ref, getCurrentInstance, watch, reactive } from 'vue';
import { lineStore } from '@/stores/lineStore';
import { tgStore } from '@/stores/tgStore';
import { TonConnectButton, useTonAddress, useTonConnectModal } from '@townsquarelabs/ui-vue';
import { beginCell, Address } from '@ton/core';
import { storeJettonTransferMessage } from '@ton-community/assets-sdk';
import { TonClient, JettonMaster } from '@ton/ton';
import { useTonConnectUI } from '@townsquarelabs/ui-vue';

const { tonConnectUI } = useTonConnectUI();
const userFriendlyAddress = useTonAddress();
const { proxy } = getCurrentInstance();
const userStore = proxy.$AppEnv.sysName === 'tg' ? tgStore() : lineStore();
const userInfo = userStore.userInfo;
const { state } = useTonConnectModal();
const firstMountedDisconnect = ref(false);  // If the connection is disconnected during onMounted, set it to true, and no pop-up window will appear during watch monitoring.

watch(userFriendlyAddress, async (newVal) => {
  console.log('userFriendlyAddress', newVal);
  console.log('userInfo wallet address', userInfo.wallet_address);
  if(!newVal){
    if (firstMountedDisconnect.value) {
      firstMountedDisconnect.value = false;
      return false;
    }
    // eslint-disable-next-line no-use-before-define
    await handleAction('wallet', null);
  }
  if(!userInfo.wallet_address){
    // eslint-disable-next-line no-use-before-define
    await handleAction('wallet', newVal);
  }
});

const popup = reactive({
  show: false,
  init: { value: '' },
  data: {},
  default: {},
});

const handleAction = async (type, data) => {
  if(type.includes('wallet')){
    userStore.setUserInfo({ 'wallet_address': data });
    userInfo['wallet_address'] = data;
  }
  if(type === 'disconnect'){
    await tonConnectUI.disconnect();
    await handleAction('wallet', null);
  }
}

const handlePopup = (type) => {
  if(type === 'open'){
    popup.data = JSON.parse(JSON.stringify(popup.init));
    popup.default = JSON.parse(JSON.stringify(popup.init));
    popup.show = true;
  }
  if(type === 'close'){
    popup.show = false;
  }
  if(type === 'reset'){
    popup.data = JSON.parse(JSON.stringify(popup.init));
  }
  if(type === 'submit'){
    handlePopup('close');
    // eslint-disable-next-line no-use-before-define
    sendTransaction();
  }
  if(type === 'input'){
    let value = popup.data.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      parts.splice(2);
      value = parts.join('.');
    }
    if (parts[0]) {
      parts[0] = parts[0].replace(/^0+(?=\d)/, '');
      value = parts.join('.');
    }
    if (value.startsWith('.')) {
      value = '0' + value;
    }
    popup.data.value = value;
  }
}
const sendTransaction = async() => {
  const USDTContract = Address.parse(proxy.$AppEnv.USDTContract);
  const userAddress = Address.parse(userInfo.wallet_address);
  const receiveAddress = Address.parse(proxy.$AppEnv.receiveAddress);
  const client = new TonClient({ endpoint: proxy.$AppEnv.TonRPCAddress });
  const jettonMaster = client.open(JettonMaster.create(USDTContract));
  const jettonAddress = await jettonMaster.getWalletAddress(userAddress);

  let payloadBase64 = beginCell().store(storeJettonTransferMessage({
    queryId: 0,
    amount: popup.data.value * 1e6,
    destination: receiveAddress,
    responseDestination: userAddress,
    customPayload: null,
    forwardAmount: 1,
    forwardPayload: null,
  })).endCell().toBoc().toString('base64');

  try {
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60, // 60 seconds validity period
      messages: [{
        address: jettonAddress.toString(),
        amount: 0.1 * 1e9, // gas
        payload: payloadBase64,
      }],
    };
    await tonConnectUI.sendTransaction(transaction);
  } catch (error) {
    console.log('Transaction failed', error);
  }
}
</script>

<style scoped lang="less">
.wallet {
  #ton-connect-button {
    display: inline-block; margin:0 12px;
    :deep(button) { padding:8px 16px; height:32px; }
  }
}
</style>
