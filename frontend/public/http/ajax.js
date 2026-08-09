import { showFullScreenLoading, tryHideFullScreenLoading } from '@utils/serviceLoading';
import { checkStatus } from './checkStatus';
import { lineStore } from '@/stores/lineStore';
import { tgStore } from '@/stores/tgStore';
import { $info } from '@utils/$info';
import { AppEnv } from '@utils/AppEnv';
import i18n from '@/i18n';

const $t = i18n.default?.global?.t || i18n.global?.t;
export const $staticURL = AppEnv.staticURL;
export const hostApi = AppEnv.apiURL + '/v1';

let userStore;

const Func401 = (msg) => {
  userStore.setUserInfo({});
  localStorage.pageFrom = window.location.href;
  sessionStorage.clear();
  location.href = window.location.origin+window.location.pathname+'#/login?t='+new Date().valueOf();
  $info('err', msg);
}

/** Set header request information */
const getHeaders = (req, headers, params, url) => {
  userStore = AppEnv.sysName === 'tg' ? tgStore() : lineStore();
  const { token, tokenDuration } = userStore;
  let loading = true, newDate = new Date().getTime();
  if(token && tokenDuration && newDate >= tokenDuration){
    Func401($t('checkStatus.401'));
    return false;
  }
  headers = headers || { };
  if (token) {
    headers = { ...headers, 'jwt': token, accountId: userStore.userInfo.id };
  }
  params = params || { };
  params._t = params._t || new Date().valueOf().toString();

  if(Object.prototype.hasOwnProperty.call(params, 'loading')){
    loading = params.loading;
    delete params.loading;
  }
  if(req.method.toLowerCase() === 'get'){
    req.params = params;
  }
  if(req.method.toLowerCase() === 'post'){
    req.data = params;
  }
  if (headers.responseType) {
    req.responseType = headers.responseType;
    delete headers.responseType;
  }
  if (headers.timeout) {
    req.timeout = headers.timeout;
    delete headers.timeout;
  }
  if(loading){
    showFullScreenLoading();
  }
  req.headers = headers;
  req.url = url;
  return { Req: req, loading };
};

const Err = (err, fn) => {
  err = { msg: $t('checkStatus.default'), code: -1 };
  return fn(err);
};

const resNext = (R, resolve) => {
  if($t('code.'+R.errcode)){
    $info('err', $t('code.'+R.errcode));
  }else{
    $info('err', $t('checkStatus.default')+'('+$t('checkStatus.errorCode')+$t('lan.colon')+`${R.errcode || R.status}`+$t('lan.point'))+')';
  }
  resolve(R);
};

/** Encapsulate json static file request **/
export const getStaticJSON = (url, loading) => {
  loading && showFullScreenLoading();
  return new Promise((resolve, reject) => {
    window.axios({
      method: 'get',
      url: url,
      dataType: 'json',
      cache: false,
    }).then(res => {
      resolve(res.data);
    }).catch(err => {
      return Err(err, reject);
    }).finally(() => {
      loading && tryHideFullScreenLoading();
    });
  });
};

const API = (method, url, params, headers) => {
  const headerResult = getHeaders({ method }, headers, params, url);
  if (!headerResult) {
    return Promise.resolve({ code: 401, errcode: 401 });
  }
  const { Req, loading } = headerResult;
  return new Promise((resolve) => {
    window.axios(Req).then(res => {
      loading && tryHideFullScreenLoading();
      if(res.status === 200){
        if(res.data){
          if(res.data.errcode === 0 || res.request.responseType === 'blob'){
            if(Req.url.includes('account/login')){
              res.data.jwt = res.headers.jwt;
            }
            resolve({ ...res.data, code: 0 });
          } else if(res.data.errcode === 401){
            Func401(res.data.errmsg);
            return false;
          } else{
            return resNext(res.data, resolve);
          }
        }else{
          return Err(res, resolve);
        }
      }else{
        checkStatus(res.status, $t);
        resolve(res.data || {});
      }
    }).catch(err => {
      loading && tryHideFullScreenLoading();
      const status = err?.response?.status || err?.request?.status || err?.status;
      if(status === 401){
        return Func401($t('checkStatus.401'));
      }
      checkStatus(status, $t);
      return Err(err, resolve);
    });
  });
}

export const getApi = (url, params, headers = {}) => {
  return API('GET', url, params, headers);
};

export const postApi = (url, params, headers = {}) => {
  return API('POST', url, params, headers);
};
