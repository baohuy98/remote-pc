import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const [serverIp, setServerIp] = useState('127.0.0.1');
  const [status, setStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [screenshot, setScreenshot] = useState<string>('');
  const [processes, setProcesses] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<'screen' | 'processes' | 'system'>('screen');
  const [keyInput, setKeyInput] = useState('');
  const [serverScreenSize, setServerScreenSize] = useState({ width: 1920, height: 1080 });
  const screenRef = useRef<HTMLImageElement>(null);
  const streamIntervalRef = useRef<number | null>(null);

  const sendCommand = useCallback((action: string, params: any = {}) => {
    window.electron.sendCommand({ action, params });
  }, []);

  // Listen for server events
  useEffect(() => {
    window.electron.onServerStatus((newStatus: string) => {
      setStatus(newStatus === 'connected' ? 'connected' : 'disconnected');
    });

    window.electron.onServerResponse((data: any) => {
      if (data.action === 'screenshot' && data.data) {
        setScreenshot(`data:image/png;base64,${data.data}`);
      }
      if (data.action === 'list_processes' && data.data) {
        setProcesses(data.data);
      }
      if (data.action === 'screen_info' && data.data) {
        setServerScreenSize(data.data);
      }
    });
  }, []);

  // Auto-stream screenshots
  useEffect(() => {
    if (isStreaming && status === 'connected') {
      streamIntervalRef.current = window.setInterval(() => {
        sendCommand('screenshot');
      }, 500);
    }
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    };
  }, [isStreaming, status, sendCommand]);

  const connectToServer = () => {
    window.electron.connectServer(serverIp);
  };

  const disconnect = () => {
    window.electron.connectServer('__disconnect__');
    setStatus('disconnected');
    setIsStreaming(false);
    setScreenshot('');
  };

  // Calculate real screen coordinates from click on image
  const handleScreenClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!screenRef.current || status !== 'connected') return;

    const rect = screenRef.current.getBoundingClientRect();
    const scaleX = serverScreenSize.width / rect.width;
    const scaleY = serverScreenSize.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    sendCommand('mouse_move', { x, y });
    setTimeout(() => {
      sendCommand('mouse_click', { button: e.button === 2 ? 'right' : 'left' });
    }, 50);
  };

  const handleScreenRightClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    if (!screenRef.current || status !== 'connected') return;

    const rect = screenRef.current.getBoundingClientRect();
    const scaleX = serverScreenSize.width / rect.width;
    const scaleY = serverScreenSize.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    sendCommand('mouse_move', { x, y });
    setTimeout(() => {
      sendCommand('mouse_click', { button: 'right' });
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (status !== 'connected') return;
    e.preventDefault();

    const keyMap: Record<string, string> = {
      Enter: 'Return',
      Backspace: 'Backspace',
      Tab: 'Tab',
      Escape: 'Escape',
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      Delete: 'Delete',
      Home: 'Home',
      End: 'End',
      ' ': 'Space',
    };

    const key = keyMap[e.key] || e.key;
    if (key.length === 1) {
      sendCommand('type_text', { text: key });
    } else {
      sendCommand('key_press', { key });
    }
  };

  const isConnected = status === 'connected';

  return (
    <div className="app" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Header */}
      <header className="header">
        <h1>Remote PC Control</h1>
        <div className="connection-bar">
          <input
            type="text"
            value={serverIp}
            onChange={(e) => setServerIp(e.target.value)}
            placeholder="Server IP"
            disabled={isConnected}
          />
          {!isConnected ? (
            <button className="btn btn-connect" onClick={connectToServer}>
              Connect
            </button>
          ) : (
            <button className="btn btn-disconnect" onClick={disconnect}>
              Disconnect
            </button>
          )}
          <span className={`status-dot ${status}`} />
          <span className="status-text">
            {status === 'connected' ? 'Connected' : status === 'error' ? 'Error' : 'Disconnected'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="main">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="tabs">
            <button
              className={`tab ${activeTab === 'screen' ? 'active' : ''}`}
              onClick={() => setActiveTab('screen')}
            >
              Screen
            </button>
            <button
              className={`tab ${activeTab === 'processes' ? 'active' : ''}`}
              onClick={() => setActiveTab('processes')}
            >
              Processes
            </button>
            <button
              className={`tab ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              System
            </button>
          </nav>

          {activeTab === 'screen' && (
            <div className="panel">
              <h3>Screen Controls</h3>
              <button
                className="btn btn-action"
                onClick={() => sendCommand('screenshot')}
                disabled={!isConnected}
              >
                Take Screenshot
              </button>
              <button
                className={`btn ${isStreaming ? 'btn-stop' : 'btn-action'}`}
                onClick={() => setIsStreaming(!isStreaming)}
                disabled={!isConnected}
              >
                {isStreaming ? 'Stop Streaming' : 'Start Live Stream'}
              </button>

              <h3>Keyboard</h3>
              <div className="key-input-group">
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Type text to send..."
                  disabled={!isConnected}
                />
                <button
                  className="btn btn-action"
                  onClick={() => {
                    if (keyInput) {
                      sendCommand('type_text', { text: keyInput });
                      setKeyInput('');
                    }
                  }}
                  disabled={!isConnected || !keyInput}
                >
                  Send
                </button>
              </div>
              <p className="hint">Click on the screen to control mouse. Press keys while focused.</p>
            </div>
          )}

          {activeTab === 'processes' && (
            <div className="panel">
              <h3>Process Manager</h3>
              <button
                className="btn btn-action"
                onClick={() => sendCommand('list_processes')}
                disabled={!isConnected}
              >
                Refresh Processes
              </button>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="panel">
              <h3>System Commands</h3>
              <button
                className="btn btn-action"
                onClick={() => sendCommand('lock')}
                disabled={!isConnected}
              >
                Lock PC
              </button>
              <button
                className="btn btn-warning"
                onClick={() => sendCommand('restart')}
                disabled={!isConnected}
              >
                Restart PC
              </button>
              <button
                className="btn btn-danger"
                onClick={() => sendCommand('shutdown')}
                disabled={!isConnected}
              >
                Shutdown PC
              </button>
              <button
                className="btn btn-action"
                onClick={() => sendCommand('cancel_shutdown')}
                disabled={!isConnected}
              >
                Cancel Shutdown
              </button>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <section className="content">
          {activeTab === 'screen' && (
            <div className="screen-viewer">
              {screenshot ? (
                <img
                  ref={screenRef}
                  src={screenshot}
                  alt="Remote Screen"
                  className="remote-screen"
                  onClick={handleScreenClick}
                  onContextMenu={handleScreenRightClick}
                  draggable={false}
                />
              ) : (
                <div className="screen-placeholder">
                  {isConnected
                    ? 'Click "Take Screenshot" or "Start Live Stream" to view remote screen'
                    : 'Connect to a server to begin'}
                </div>
              )}
            </div>
          )}

          {activeTab === 'processes' && (
            <div className="process-list">
              {processes.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>PID</th>
                      <th>Name</th>
                      <th>CPU %</th>
                      <th>Memory %</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map((p, i) => (
                      <tr key={i}>
                        <td>{p.pid}</td>
                        <td>{p.name}</td>
                        <td>{p.cpu?.toFixed(1)}</td>
                        <td>{p.mem?.toFixed(1)}</td>
                        <td>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() => sendCommand('kill_process', { pid: p.pid })}
                          >
                            Kill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="screen-placeholder">
                  Click "Refresh Processes" to load the process list
                </div>
              )}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="system-info">
              <div className="screen-placeholder">
                Use the sidebar controls to manage the remote system
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
