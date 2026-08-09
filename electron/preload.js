const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('recruitment', {
  candidate: {
    search: (params) => ipcRenderer.invoke('candidate:search', params),
    get: (id) => ipcRenderer.invoke('candidate:get', id),
    update: (id, data) => ipcRenderer.invoke('candidate:update', id, data),
  },
  position: {
    create: (data) => ipcRenderer.invoke('position:create', data),
    listCandidates: (id) => ipcRenderer.invoke('position:listCandidates', id),
  },
  customer: {
    create: (data) => ipcRenderer.invoke('customer:create', data),
  },
  system: {
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
  },
});
