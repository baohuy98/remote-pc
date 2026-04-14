const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),   // ← Sửa đường dẫn quan trọng
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:5173');
  mainWindow.maximize();
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});