import { readFileSync, existsSync } from 'node:fs';

export function isRunningInDocker() {
  try {
    if (existsSync('/.dockerenv')) return true;
    if (existsSync('/proc/1/cgroup')) {
      const content = readFileSync('/proc/1/cgroup', 'utf8');
      return content.includes('docker') || content.includes('containerd');
    }
  } catch {
    // ignore errors
  }
  return false;
}