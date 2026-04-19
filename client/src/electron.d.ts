/// <reference types="vite/client" />

interface ElectronAPI {
  connectServer: (payload: { ip: string; token: string }) => void;
  sendCommand: (command: any) => void;
  onServerStatus: (callback: (status: string) => void) => () => void;
  onServerResponse: (callback: (data: any) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};