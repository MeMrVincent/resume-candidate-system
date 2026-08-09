import { getApi, postApi, hostApi, getStaticJSON, $staticURL } from './ajax';

export const $API = {
/** == Common ================================================================================================= **/
  getParamJSON: params => {
    return getStaticJSON($staticURL + 'static/json/' + params + '.json?_t=' + new Date().valueOf());
  },
  getDiyJSON: params => {
    return getStaticJSON($staticURL + params + '?_t=' + new Date().valueOf());
  },
  /** == ajax demo ================================================================================================= **/
  getApiWithParams: (params) => {
    return getApi(`${hostApi}/get/api`, params );
  },
  getApiNoParams: () => {
    return getApi(`${hostApi}/get/api`);
  },
  postApiWithParams: params => {
    return postApi(`${hostApi}/post/api`, params);
  },
  postApiNoParams: () => {
    return postApi(`${hostApi}/post/api`);
  },
  apiWithHeaders: () => {
    return postApi(`${hostApi}/post/api`, {}, { 'Content-Type': 'multipart/form-data' });
  },
};

