import { keyboard, mouse, Point, Key, Button } from '@nut-tree-fork/nut-js';
import { Response } from '../types';

export async function pressKey(key: string): Promise<Response> {
  const nutKey = (Key as any)[key.toUpperCase()] ?? (Key as any)[key];
  if (!nutKey) {
    return { action: 'key_press', data: null, success: false, error: `Unknown key: ${key}` };
  }

  await keyboard.pressKey(nutKey);
  await keyboard.releaseKey(nutKey);

  return { action: 'key_press', data: { key }, success: true };
}

export async function typeText(text: string): Promise<Response> {
  await keyboard.type(text);
  return { action: 'type_text', data: { text }, success: true };
}

export async function moveMouse(x: number, y: number): Promise<Response> {
  await mouse.setPosition(new Point(x, y));
  return { action: 'mouse_move', data: { x, y }, success: true };
}

export async function clickMouse(button: 'left' | 'right' = 'left'): Promise<Response> {
  const btn = button === 'right' ? Button.RIGHT : Button.LEFT;
  await mouse.click(btn);
  return { action: 'mouse_click', data: { button }, success: true };
}
