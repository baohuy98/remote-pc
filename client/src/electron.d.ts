/// <reference types="vite/client" />

interface ElectronAPI {
  connectServer: (ip: string) => void;
  sendCommand: (command: any) => void;
  onServerStatus: (callback: (status: string) => void) => void;
  onServerResponse: (callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};