import { ElLoading } from 'element-plus';

let loadingInstance;

const startLoading = (text) => {
  loadingInstance = ElLoading.service({
    fullscreen: true,
    lock: true,
    text: text || 'Loading',
    background: 'rgba(0, 0, 0, 0.7)',
  });
};

const endLoading = () => {
  loadingInstance.close();
};

let needLoadingRequestCount = 0;
export const showFullScreenLoading = (text) => {
  if (needLoadingRequestCount === 0) {
    startLoading(text);
  }
  needLoadingRequestCount++;
};

export const tryHideFullScreenLoading = () => {
  if (needLoadingRequestCount <= 0) {
    return;
  }
  needLoadingRequestCount--;
  if (needLoadingRequestCount === 0) {
    endLoading();
  }
};
