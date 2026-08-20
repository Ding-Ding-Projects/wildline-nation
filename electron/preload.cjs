const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wildline', {
  loadSave: () => ipcRenderer.invoke('save:load'),
  save: (value) => ipcRenderer.invoke('save:write', value),
  close: () => ipcRenderer.invoke('app:close'),
});
