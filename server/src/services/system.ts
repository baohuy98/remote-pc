import { exec } from 'child_process';
import si from 'systeminformation';
import { Response } from '../types';

function run(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

export async function shutdownPC(): Promise<Response> {
  await run('shutdown /s /t 5');
  return { action: 'shutdown', data: { message: 'Shutting down in 5 seconds' }, success: true };
}

export async function restartPC(): Promise<Response> {
  await run('shutdown /r /t 5');
  return { action: 'restart', data: { message: 'Restarting in 5 seconds' }, success: true };
}

export async function lockPC(): Promise<Response> {
  await run('rundll32.exe user32.dll,LockWorkStation');
  return { action: 'lock', data: { message: 'PC locked' }, success: true };
}

export async function cancelShutdown(): Promise<Response> {
  await run('shutdown /a');
  return { action: 'cancel_shutdown', data: { message: 'Shutdown cancelled' }, success: true };
}

export async function getScreenInfo(): Promise<Response> {
  const g = await si.graphics();
  const primary = g.displays.find((d) => d.main) ?? g.displays[0];
  const width = primary?.currentResX ?? 1920;
  const height = primary?.currentResY ?? 1080;
  return { action: 'screen_info', data: { width, height }, success: true };
}
