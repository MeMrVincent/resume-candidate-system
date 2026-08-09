import { ElNotification } from 'element-plus';
import i18n from '@/i18n';

const $t = i18n.default?.global?.t || i18n.global?.t;

/** Notification "success", "info", "warning", "error" */
export const $info = ( type = '', message = '', title = '', duration = 1500 ) => {
  title = title ? title : type === 'ok' ? $t('info.ok'): type === 'err' ? $t('info.err'): type === 'info'? $t('info.info'):type === 'fail'? $t('info.fail'): type === 'warning'? $t('info.warning'): $t('info.info');
  type = type === 'ok' ? 'success': type === 'err' ? 'error': type === 'fail' ? 'error':type;
  return ElNotification( { title, message, type, duration } );
};
