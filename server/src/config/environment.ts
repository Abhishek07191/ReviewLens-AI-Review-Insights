import { config } from 'dotenv';
import { resolve } from 'node:path';

export function loadServerEnvironment(serverDirectory: string): void {
  config({ path: resolve(serverDirectory, '.env') });
  config({ path: resolve(serverDirectory, '../.env') });
  config({ path: resolve(serverDirectory, '../.env.example') });
}
