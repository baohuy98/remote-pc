const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { io } = require('socket.io-client');

let mainWindow;
let socket = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:5173');
  mainWindow.maximize();
}

// IPC: Connect to server
ipcMain.on('connect-server', (_event, payload) => {
  // Support disconnect sentinel: payload.ip === '__disconnect__'
  const ip = typeof payload === 'string' ? payload : payload?.ip;
  const token = typeof payload === 'object' && payload ? payload.token : '';

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  if (ip === '__disconnect__') return;

  console.log(`Connecting to server at ${ip}:3000...`);
  socket = io(`http://${ip}:3000`, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    mainWindow.webContents.send('server-status', 'connected');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    mainWindow.webContents.send('server-status', 'disconnected');
  });

  socket.on('connect_error', (err) => {
    console.log('Connection error:', err.message);
    mainWindow.webContents.send('server-status', 'error');
  });

  socket.on('response', (data) => {
    console.log('Server response:', data.action, data.success);
    mainWindow.webContents.send('server-response', data);
  });
});

// IPC: Send command to server
ipcMain.on('send-command', (_event, command) => {
  if (socket && socket.connected) {
    socket.emit('command', command);
  } else {
    mainWindow.webContents.send('server-response', {
      action: command.action,
      data: null,
      success: false,
      error: 'Not connected to server',
    });
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (socket) socket.disconnect();
  if (process.platform !== 'darwin') app.quit();
});
