import { exec } from 'child_process';
import { randomUUID } from 'crypto';
import { readFile, writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { Response } from '../types';

export async function captureScreen(): Promise<Response> {
  const id = randomUUID();
  const tmpFile = path.join(tmpdir(), `screenshot_${id}.png`);
  const psFile = path.join(tmpdir(), `screenshot_${id}.ps1`);

  const psScript = [
    'Add-Type -AssemblyName System.Windows.Forms',
    'Add-Type -AssemblyName System.Drawing',
    '$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds',
    '$bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)',
    '$graphics = [System.Drawing.Graphics]::FromImage($bitmap)',
    '$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)',
    `$bitmap.Save('${tmpFile.replace(/\\/g, '/')}', [System.Drawing.Imaging.ImageFormat]::Png)`,
    '$graphics.Dispose()',
    '$bitmap.Dispose()',
  ].join('\n');

  await writeFile(psFile, psScript);

  try {
    await new Promise<void>((resolve, reject) => {
      exec(
        `powershell -NoProfile -STA -ExecutionPolicy Bypass -File "${psFile}"`,
        (error, _stdout, stderr) => {
          if (error) reject(new Error(stderr || error.message));
          else resolve();
        }
      );
    });

    const imgBuffer = await readFile(tmpFile);
    const base64 = imgBuffer.toString('base64');

    return {
      action: 'screenshot',
      data: base64,
      success: true,
    };
  } finally {
    await Promise.all([
      unlink(tmpFile).catch((e) => {
        if (e?.code !== 'ENOENT') console.warn(`screen: failed to unlink ${tmpFile}:`, e?.message);
      }),
      unlink(psFile).catch((e) => {
        if (e?.code !== 'ENOENT') console.warn(`screen: failed to unlink ${psFile}:`, e?.message);
      }),
    ]);
  }
}
