const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("messagesCleaner", {
  getDefaultRoots: () => ipcRenderer.invoke("roots:get"),
  showItemMenu: (id) => ipcRenderer.invoke("items:context-menu", id),
  openItem: (id) => ipcRenderer.invoke("items:open", id),
  openFullDiskAccess: () => ipcRenderer.invoke("settings:full-disk-access"),
  revealItem: (id) => ipcRenderer.invoke("items:reveal", id),
  scanImages: () => ipcRenderer.invoke("images:scan"),
  trashItems: (ids) => ipcRenderer.invoke("items:trash", ids),
});
