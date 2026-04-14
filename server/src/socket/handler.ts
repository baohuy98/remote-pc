import { Socket, Server } from 'socket.io';
import { Command, Response } from '../types';
import { captureScreen } from '../services/screen';
import { listProcesses, killProcess } from '../services/process';
import { pressKey, typeText, moveMouse, clickMouse } from '../services/input';
import { shutdownPC, restartPC, lockPC, cancelShutdown } from '../services/system';

export function registerSocketHandler(_io: Server, socket: Socket): void {
  socket.on('command', async (cmd: Command) => {
    console.log(`Received command: ${cmd.action}`, cmd.params);

    let response: Response;

    try {
      switch (cmd.action) {
        case 'screenshot':
          response = await captureScreen();
          break;
        case 'list_processes':
          response = await listProcesses();
          break;
        case 'kill_process':
          response = await killProcess(cmd.params.pid);
          break;
        case 'key_press':
          response = await pressKey(cmd.params.key);
          break;
        case 'type_text':
          response = await typeText(cmd.params.text);
          break;
        case 'mouse_move':
          response = await moveMouse(cmd.params.x, cmd.params.y);
          break;
        case 'mouse_click':
          response = await clickMouse(cmd.params.button);
          break;
        case 'shutdown':
          response = await shutdownPC();
          break;
        case 'restart':
          response = await restartPC();
          break;
        case 'lock':
          response = await lockPC();
          break;
        case 'cancel_shutdown':
          response = await cancelShutdown();
          break;
        default:
          response = { action: cmd.action, data: null, success: false, error: `Unknown action: ${cmd.action}` };
      }
    } catch (err: any) {
      response = { action: cmd.action, data: null, success: false, error: err.message };
    }

    socket.emit('response', response);
  });
}
