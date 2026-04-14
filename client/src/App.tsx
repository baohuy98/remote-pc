import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [serverIp, setServerIp] = useState('192.168.1.100'); // Thay bằng IP máy Server
  const [status, setStatus] = useState('Chưa kết nối');
  const [screenshot, setScreenshot] = useState<string>('');
  const [processes, setProcesses] = useState<any[]>([]);

  // Nhận trạng thái kết nối
  useEffect(() => {
    window.electron.onServerStatus((newStatus: string) => {
      setStatus(newStatus === 'connected' ? '✅ Đã kết nối Server' : '❌ Mất kết nối');
    });

    window.electron.onServerResponse((data: any) => {
      if (data.action === 'screenshot' && data.data) {
        setScreenshot(`data:image/png;base64,${data.data}`);
      }

      if (data.action === 'list_processes' && data.data) {
        setProcesses(data.data);
      }
    });
  }, []);

  const connectToServer = () => {
    window.electron.connectServer(serverIp);
  };

  const sendCommand = (action: string, params: any = {}) => {
    window.electron.sendCommand({ action, params });
  };

  return (
    <div className="app">
      <h1>ỨNG DỤNG ĐIỀU KHIỂN PC TỪ XA</h1>

      <div className="control-panel">
        <input 
          type="text" 
          value={serverIp} 
          onChange={(e) => setServerIp(e.target.value)}
          placeholder="Nhập IP Server (ví dụ: 192.168.1.100)"
        />
        <button onClick={connectToServer}>KẾT NỐI SERVER</button>
        <p><strong>Trạng thái:</strong> {status}</p>
      </div>

      <div className="buttons">
        <button onClick={() => sendCommand('list_processes')}>📋 List Processes</button>
        <button onClick={() => sendCommand('screenshot')}>📸 Chụp màn hình</button>
        <button onClick={() => sendCommand('key_press', { key: 'a' })}>⌨️ Nhấn phím A (test)</button>
        <button onClick={() => sendCommand('shutdown')}>⛔ Shutdown (Tắt máy)</button>
      </div>

      {/* Hiển thị ảnh chụp màn hình */}
      {screenshot && (
        <div>
          <h3>Ảnh màn hình từ Server:</h3>
          <img src={screenshot} alt="Remote Screen" style={{ maxWidth: '100%', border: '2px solid #333' }} />
        </div>
      )}

      {/* Danh sách Process */}
      {processes.length > 0 && (
        <div>
          <h3>Danh sách Process:</h3>
          <ul>
            {processes.slice(0, 10).map((p, i) => (
              <li key={i}>{p.name} (PID: {p.pid})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;