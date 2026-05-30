import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { basename, dirname, extname, resolve, join, relative, isAbsolute, sep } from 'path';
import { promisify } from 'util';
import type { ArchiveFormat, FileEntry } from '../../../../shared/types/index.js';

export const FILES_ROOT = resolve(process.env.FILES_ROOT?.trim() || homedir());
const runFile = promisify(execFile);

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

function cleanPaths(paths: string[]): string[] {
  if (!Array.isArray(paths) || paths.length === 0) throw new Error('paths required');
  return paths.map((p) => safePath(p));
}

async function uniqueDest(destDir: string, name: string): Promise<string> {
  const parsedExt = extname(name);
  const stem = parsedExt ? name.slice(0, -parsedExt.length) : name;
  let candidate = join(destDir, name);
  for (let i = 1; ; i += 1) {
    try {
      await fs.access(candidate);
      candidate = join(destDir, `${stem} copy${i === 1 ? '' : ` ${i}`}${parsedExt}`);
    } catch {
      return candidate;
    }
  }
}

function assertNotInsideSelf(source: string, destDir: string): void {
  const rel = relative(source, destDir);
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) {
    throw new Error('Cannot copy or move a folder into itself');
  }
}

export async function copyPaths(paths: string[], destDirPath: string): Promise<void> {
  const sources = cleanPaths(paths);
  const destDir = safePath(destDirPath);
  await fs.mkdir(destDir, { recursive: true });
  for (const source of sources) {
    assertNotInsideSelf(source, destDir);
    const dest = await uniqueDest(destDir, basename(source));
    await fs.cp(source, dest, { recursive: true, errorOnExist: false });
  }
}

export async function movePaths(paths: string[], destDirPath: string): Promise<void> {
  const sources = cleanPaths(paths);
  const destDir = safePath(destDirPath);
  await fs.mkdir(destDir, { recursive: true });
  for (const source of sources) {
    assertNotInsideSelf(source, destDir);
    const dest = await uniqueDest(destDir, basename(source));
    try {
      await fs.rename(source, dest);
    } catch {
      await fs.cp(source, dest, { recursive: true, errorOnExist: false });
      await fs.rm(source, { recursive: true, force: true });
    }
  }
}

export async function removePaths(paths: string[]): Promise<void> {
  const targets = cleanPaths(paths);
  for (const target of targets) await fs.rm(target, { recursive: true, force: true });
}

function commonParent(paths: string[]): string {
  const parents = paths.map((p) => dirname(p).split(sep));
  const first = parents[0];
  let i = 0;
  while (i < first.length && parents.every((parts) => parts[i] === first[i])) i += 1;
  return first.slice(0, i).join(sep) || sep;
}

function archiveArgs(format: ArchiveFormat, dest: string, relatives: string[]) {
  if (format === 'zip') return { command: 'zip', args: ['-r', dest, ...relatives] };
  if (format === 'tar.gz') return { command: 'tar', args: ['-czf', dest, ...relatives] };
  return { command: '7z', args: ['a', dest, ...relatives] };
}

export async function createArchive(paths: string[], destPath: string, format: ArchiveFormat): Promise<string> {
  const sources = cleanPaths(paths);
  const dest = safePath(destPath);
  await fs.mkdir(dirname(dest), { recursive: true });
  const cwd = commonParent(sources);
  const relatives = sources.map((source) => relative(cwd, source));
  const { command, args } = archiveArgs(format, dest, relatives);
  await runFile(command, args, { cwd, timeout: 120000 });
  return dest;
}

export async function extractArchive(archivePath: string, destDirPath: string): Promise<void> {
  const archive = safePath(archivePath);
  const destDir = safePath(destDirPath);
  await fs.mkdir(destDir, { recursive: true });
  const lower = archive.toLowerCase();
  if (lower.endsWith('.zip')) {
    await runFile('unzip', ['-o', archive, '-d', destDir], { timeout: 120000 });
    return;
  }
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    await runFile('tar', ['-xzf', archive, '-C', destDir], { timeout: 120000 });
    return;
  }
  if (lower.endsWith('.7z')) {
    await runFile('7z', ['x', archive, `-o${destDir}`, '-y'], { timeout: 120000 });
    return;
  }
  throw new Error('Unsupported archive format');
}

export function downloadPath(filePath: string): string {
  return safePath(filePath);
}
