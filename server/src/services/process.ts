import si from 'systeminformation';
import { Response } from '../types';

export async function listProcesses(): Promise<Response> {
  const data = await si.processes();
  const processes = data.list
    .sort((a, b) => b.mem - a.mem)
    .slice(0, 50)
    .map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu,
      mem: p.mem,
    }));

  return {
    action: 'list_processes',
    data: processes,
    success: true,
  };
}

export async function killProcess(pid: number): Promise<Response> {
  try {
    process.kill(pid);
    return { action: 'kill_process', data: { pid }, success: true };
  } catch (err: any) {
    return { action: 'kill_process', data: null, success: false, error: err.message };
  }
}
