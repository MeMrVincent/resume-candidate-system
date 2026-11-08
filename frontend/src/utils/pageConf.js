/**
 * 列表分页默认配置，页面里 reactive({ ...pageConf }) 使用
 * Default pagination config for lists; pages use it as reactive({ ...pageConf })
 * 一覧のページング既定設定。ページでは reactive({ ...pageConf }) として使う
 */
export const pageConf = {
  pageSize: 20,
  totalSize: 0,
  currentPage: 1,
  pageList: [20, 30, 50, 100, 150, 200],
  layout: "total, sizes, prev, pager, next, jumper"
};
