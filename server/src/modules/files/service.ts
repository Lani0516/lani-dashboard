import { promises as fs } from 'fs';
import { homedir } from 'os';
import { resolve, join, relative, isAbsolute, sep } from 'path';
import type { FileEntry } from '../../../../shared/types/index.js';

export const FILES_ROOT = resolve(process.env.FILES_ROOT?.trim() || homedir());

const MAX_READ_BYTES = 2 * 1024 * 1024; // 2 MB text editor cap

// Resolve a client-supplied path and guarantee it stays inside FILES_ROOT.
export function safePath(p?: string): string {
  const target = !p ? FILES_ROOT : isAbsolute(p) ? resolve(p) : resolve(FILES_ROOT, p);
  const rel = relative(FILES_ROOT, target);
  if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
    throw new Error('Path outside allowed root');
  }
  return target;
}

export async function listDir(dirPath: string): Promise<FileEntry[]> {
  const dir = safePath(dirPath);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: FileEntry[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    let size = 0;
    let modified = 0;
    let permissions = '';
    try {
      const st = await fs.lstat(full);
      size = st.size;
      modified = st.mtimeMs;
      permissions = (st.mode & 0o777).toString(8);
    } catch {
      // dangling symlink / permission denied — still list it
    }
    out.push({
      name: e.name,
      path: full,
      type: e.isDirectory() ? 'directory' : e.isSymbolicLink() ? 'symlink' : 'file',
      size,
      modified,
      permissions,
    });
  }
  out.sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

export async function readFileText(filePath: string): Promise<string> {
  const file = safePath(filePath);
  const st = await fs.stat(file);
  if (!st.isFile()) throw new Error('Not a file');
  if (st.size > MAX_READ_BYTES) throw new Error(`File too large to edit (>${MAX_READ_BYTES} bytes)`);
  return fs.readFile(file, 'utf-8');
}

export async function writeFileText(filePath: string, content: string): Promise<void> {
  const file = safePath(filePath);
  await fs.writeFile(file, content, 'utf-8');
}

export async function makeDir(dirPath: string): Promise<void> {
  await fs.mkdir(safePath(dirPath), { recursive: true });
}

export async function removePath(targetPath: string): Promise<void> {
  await fs.rm(safePath(targetPath), { recursive: true, force: true });
}

export async function renamePath(from: string, to: string): Promise<void> {
  await fs.rename(safePath(from), safePath(to));
}

export function downloadPath(filePath: string): string {
  return safePath(filePath);
}
