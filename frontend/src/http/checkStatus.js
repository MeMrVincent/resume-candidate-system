import { ElNotification } from 'element-plus';

export const checkStatus = (status, $t) => {
  let msg = $t('checkStatus.'+status) || $t('checkStatus.default');
  console.log('error status==>', status, msg);
  ElNotification.error({
    title: $t('info.err'),
    message: msg,
    showClose: true,
    duration: 2000,
  });
};
