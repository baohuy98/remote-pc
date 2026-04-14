import screenshot from 'screenshot-desktop';
import { Response } from '../types';

export async function captureScreen(): Promise<Response> {
  const imgBuffer = await screenshot({ format: 'png' });
  const base64 = imgBuffer.toString('base64');

  return {
    action: 'screenshot',
    data: base64,
    success: true,
  };
}
