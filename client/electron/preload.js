const { contextBridge, ipcRenderer } = require('electron');

console.log('✅ Preload script is running...');   // Dòng này để kiểm tra

contextBridge.exposeInMainWorld('electron', {
  connectServer: (ip) => {
    console.log('📡 Gọi connectServer với IP:', ip);
    ipcRenderer.send('connect-server', ip);
  },
  sendCommand: (command) => {
    console.log('📤 Gửi command:', command);
    ipcRenderer.send('send-command', command);
  },
  onServerStatus: (callback) => ipcRenderer.on('server-status', (_, status) => callback(status)),
  onServerResponse: (callback) => ipcRenderer.on('server-response', (_, data) => callback(data)),
});