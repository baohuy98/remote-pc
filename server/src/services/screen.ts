import { exec } from 'child_process';
import { readFile, writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { Response } from '../types';

export async function captureScreen(): Promise<Response> {
  const tmpFile = path.join(tmpdir(), `screenshot_${Date.now()}.png`);
  const psFile = path.join(tmpdir(), `screenshot_${Date.now()}.ps1`);

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

  await new Promise<void>((resolve, reject) => {
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${psFile}"`,
      (error, _stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve();
      }
    );
  });

  const imgBuffer = await readFile(tmpFile);
  const base64 = imgBuffer.toString('base64');

  // Clean up temp files
  unlink(tmpFile).catch(() => {});
  unlink(psFile).catch(() => {});

  return {
    action: 'screenshot',
    data: base64,
    success: true,
  };
}
