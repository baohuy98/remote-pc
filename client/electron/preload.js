const { contextBridge, ipcRenderer } = require('electron');

console.log('✅ Preload script is running...');   // Dòng này để kiểm tra

contextBridge.exposeInMainWorld('electron', {
  connectServer: (payload) => {
    console.log('📡 Gọi connectServer:', payload);
    ipcRenderer.send('connect-server', payload);
  },
  sendCommand: (command) => {
    console.log('📤 Gửi command:', command);
    ipcRenderer.send('send-command', command);
  },
  onServerStatus: (callback) => {
    const handler = (_, status) => callback(status);
    ipcRenderer.on('server-status', handler);
    return () => ipcRenderer.removeListener('server-status', handler);
  },
  onServerResponse: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('server-response', handler);
    return () => ipcRenderer.removeListener('server-response', handler);
  },
});