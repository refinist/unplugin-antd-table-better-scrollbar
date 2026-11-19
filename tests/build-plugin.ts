import { execSync } from 'node:child_process';

// Exercise the same compiled entry points that consumers import.
export default function setup() {
  execSync('node playground/build-original-tables.ts', { stdio: 'inherit' });
  execSync('vp pack', { stdio: 'inherit' });
}
