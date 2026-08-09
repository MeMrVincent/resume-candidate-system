<template>
  <div class="wallet CRound wh100 MFlex">
    <!--code start-->
    <el-button v-if="!userInfo['wallet_address']" type="primary" round @click="handleWallet('connect')">
      {{ proxy.$t('wallet.connect') }}
    </el-button>
    <template v-if="userInfo['wallet_address']">
      <el-dropdown trigger="hover" class="WalletElDropDown">
        <div class="Flex pointer">
          <template v-if="walletInfo.status === 'connected'">
            <b class="green" />
            {{ proxy.$t('wallet.connected') }}
          </template>
          <template v-else>
            <b class="red" />
            {{ proxy.$t('wallet.disconnected') }}
          </template>
          {{ userInfo['wallet_address'].slice(0, 6)+'......'+userInfo['wallet_address'].slice(-6) }}
          <el-icon class="Flex">
            <CaretBottom />
          </el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu v-if="walletInfo.status === 'connected'">
            <el-dropdown-item class="Flex" @click="handlePopup('open');">
              {{ proxy.$t('wallet.reCharge') }}
            </el-dropdown-item>
            <el-dropdown-item divided class="Flex" @click="handleWallet('disconnect')">
              {{ proxy.$t('wallet.disconnect') }}
            </el-dropdown-item>
          </el-dropdown-menu>
          <el-dropdown-menu v-else>
            <el-dropdown-item class="Flex" @click="handleWallet('connect')">
              {{ proxy.$t('wallet.connect') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </template>
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
import { reactive, getCurrentInstance, watch } from 'vue';
import { lineStore } from '@/stores/lineStore';
import { tgStore } from '@/stores/tgStore';
import { showFullScreenLoading, tryHideFullScreenLoading } from '@utils/serviceLoading';
/** reown components codes **/
import { ethers, formatUnits } from 'ethers';
import { createAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/vue';
import { arbitrum, mainnet } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// to see https://docs.reown.com/appkit/overview to get a projectId;
const projectId = 'e83898f364c32ae1e296300d347b304c';
const networks = [mainnet, arbitrum];
const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  projectId,
  networks,
  enableEIP6963: true,
  enableInjected: true,
});
const Modal = createAppKit({
  adapters: [ wagmiAdapter ],
  networks: [ mainnet, arbitrum ],
  defaultNetwork: mainnet,
  projectId,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
    email: false,
    socials: [ ],
    emailShowWallets: false,
    allWallets: 'SHOW',
  },
});
const EVMWalletAccount = useAppKitAccount();

const { proxy } = getCurrentInstance();
const userStore = proxy.$AppEnv.sysName === 'tg' ? tgStore() : lineStore();
const userInfo = userStore.userInfo;
const walletInfo = reactive({
  address: '', //
  isConnected: false,
  status: 'disconnected', // disconnected, connected, connecting
  allAccounts: [],
  caipAddress: '', // eip155:1:0x
  embeddedWalletInfo: { }, // {user: Proxy(Object), authProvider: 'email', accountType: undefined, isSmartAccountDeployed: false}
  provider: null,
  action: '', // bind, unbind,
});

watch(EVMWalletAccount.value, async(newVal) => {
  if(newVal.status === 'connecting' || newVal.status === walletInfo.status){
    return false;
  }
  for(let key in walletInfo){
    walletInfo[key] = newVal[key] || walletInfo[key];
  }
  if(newVal.status === 'disconnected'){
    walletInfo.address = '';
  }
  if(newVal.status === 'connected'){
    // eslint-disable-next-line no-use-before-define
    Modal.subscribeWalletInfo(handlerTemp.bind(this,{ ...newVal }))
  }
  console.log('walletInfo', walletInfo);
});

const popup = reactive({
  show: false,
  init: { value: '' },
  data: {},
  default: {},
});

const handlerTemp = (data) => {
  const { walletProvider } = useAppKitProvider('eip155');
  if(!walletProvider){
    // return location.reload();
    return;
  }
  if(walletProvider){
    walletInfo.provider = walletProvider;
  }
  console.log('walletInfo.provider', walletInfo.provider);
  if(!userInfo['wallet_address']){
    userStore.setUserInfo({ 'wallet_address': data.address });
  }
}

const handleWallet = async (type) => {
  if(type === 'disconnect'){
    walletInfo.action = type;
    Modal.disconnect('eip155');
    userStore.setUserInfo({ 'wallet_address': null });
    userInfo['wallet_address'] = null;
    walletInfo.address = '';
    walletInfo.isConnected = false;
    walletInfo.status = 'disconnected';
  }
  if(type === 'connect'){
    walletInfo.action = type;
    Modal.open();
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

const erc20Abi = ['function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'];

const sendTransaction = async() => {
  showFullScreenLoading();
  console.log('walletProvider', walletInfo.provider);
  const browserProvider= new ethers.BrowserProvider(walletInfo.provider);
  const signer = await browserProvider.getSigner();
  const usdtContract = new ethers.Contract(proxy.$AppEnv.USDTContract, erc20Abi, signer);
  const rawBalance = await usdtContract.balanceOf(walletInfo.address);
  const decimals = await usdtContract.decimals();
  const formattedBalance = formatUnits(rawBalance, decimals);
  console.log(`USDT balance: ${formattedBalance}`);
  if(Number(formattedBalance) < Number(popup.data.value)){
    tryHideFullScreenLoading();
    return proxy.$info('err', proxy.$t('wallet.NotEnoughWalletMoney'));
  }
  //return;
  // const balance = await usdtContract.balanceOf(walletInfo.address);
  const amountInWei = ethers.parseUnits(popup.data.value, decimals);
  try {
    const res = await usdtContract.transfer(proxy.$AppEnv.receiveAddress, amountInWei);
    console.log('transfer sent, waiting for block confirmation...', res);
    if(typeof res === 'object' && res.hash){
      const receipt = await res.wait();
      tryHideFullScreenLoading();
      if (receipt && receipt.status === 1) {
        console.log('recharge success');
        proxy.$info('ok', proxy.$t('wallet.rechargeOk'));
      } else {
        proxy.$info('fail', proxy.$t('wallet.rechargeFail'));
      }
    }
  } catch(error) {
    tryHideFullScreenLoading();
    let msg = 'rechargeFail';
    if(error.code === 'CALL_EXCEPTION' && error.action === 'estimateGas'){
      msg = 'NotEnoughETH';
    }
    if(error.code === 'sendTransaction' && error.action === 'rejected'){
      msg = 'userRejected';
    }
    console.log('error', error);
    proxy.$info('fail', proxy.$t(`wallet.${msg}`));
  }
}
</script>
<style lang="less">
.WalletElDropDown {
  height:32px; padding: 8px 15px;border-radius: var(--el-border-radius-round); border-color: var(--el-button-border-color); border: var(--el-border); margin:0 0 0 12px;
  > div.pointer {
    b {
      height:10px; width:10px; border-radius:10px; margin:0 5px 0 0;
      &.green { background:green; }
      &.red { background:red; }
    }
    .el-icon { margin:0 0 0 5px; }
  }
}
</style>