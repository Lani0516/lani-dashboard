import { exec } from 'child_process';
import { promisify } from 'util';
import type { ProcessInfo, ProcessList, KillResult } from '../../../../shared/types/index.js';

const execAsync = promisify(exec);

// Portable ps invocation: no --sort (BSD/macOS ps lacks it), sort in JS.
// comm gives the executable name; pcpu/pmem are percentages; rss is in KB.
const PS_CMD = 'ps -eo pid,ppid,comm,pcpu,pmem,rss,user';

function parsePs(stdout: string): ProcessInfo[] {
  const lines = stdout.split('\n');
  const out: ProcessInfo[] = [];
  // Skip header line (index 0).
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // pid ppid comm pcpu pmem rss user — comm can contain spaces/paths, so
    // anchor on the numeric columns: split first two ints off the front,
    // and the last three (pcpu pmem rss user-ish) off knowledge of layout.
    // Tokenize and pull known-position columns from each end.
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 7) continue;
    const pid = Number(tokens[0]);
    const ppid = Number(tokens[1]);
    // From the end: user(last), rss, pmem, pcpu. comm is everything between.
    const user = tokens[tokens.length - 1];
    const rssKb = Number(tokens[tokens.length - 2]);
    const memPercent = Number(tokens[tokens.length - 3]);
    const cpu = Number(tokens[tokens.length - 4]);
    const name = tokens.slice(2, tokens.length - 4).join(' ');
    if (!Number.isFinite(pid) || pid <= 0) continue;
    out.push({
      pid,
      ppid: Number.isFinite(ppid) ? ppid : 0,
      name: name || '(unknown)',
      cpu: Number.isFinite(cpu) ? cpu : 0,
      memPercent: Number.isFinite(memPercent) ? memPercent : 0,
      rssBytes: Number.isFinite(rssKb) ? rssKb * 1024 : 0,
      user: user || '',
    });
  }
  return out;
}

export async function getProcessList(
  sort: 'cpu' | 'mem' = 'cpu',
  q = '',
  limit = 30
): Promise<ProcessList> {
  let processes: ProcessInfo[] = [];
  try {
    const { stdout } = await execAsync(PS_CMD, {
      timeout: 5000,
      maxBuffer: 8 * 1024 * 1024,
    });
    processes = parsePs(stdout);
  } catch {
    // Never 500 on a ps/parse hiccup — return what we have (possibly empty).
    processes = [];
  }

  const filter = q.trim().toLowerCase();
  if (filter) {
    processes = processes.filter(
      (p) => p.name.toLowerCase().includes(filter) || p.user.toLowerCase().includes(filter)
    );
  }

  processes.sort((a, b) => (sort === 'mem' ? b.memPercent - a.memPercent : b.cpu - a.cpu));

  const total = processes.length;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 30;

  return {
    processes: processes.slice(0, safeLimit),
    total,
    sort,
    timestamp: Date.now(),
  };
}

export function killProcess(pid: number, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): KillResult {
  if (!Number.isInteger(pid) || pid <= 0) {
    return { ok: false, pid, signal, error: 'Invalid pid — must be a positive integer' };
  }
  try {
    process.kill(pid, signal);
    return { ok: true, pid, signal };
  } catch (e: any) {
    let error = String(e?.message ?? e);
    if (e?.code === 'EPERM') error = `Permission denied killing pid ${pid} (try running as root)`;
    else if (e?.code === 'ESRCH') error = `No such process: ${pid}`;
    return { ok: false, pid, signal, error };
  }
}
