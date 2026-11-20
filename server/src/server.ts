import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createDatabase } from './database/database.js';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const port = Number.parseInt(process.env.PORT ?? '3001', 10);
const database = createDatabase();
const app = createApp({ database });
const server = app.listen(port, () => {
  console.info(`ReviewLens API listening on port ${port}`);
});
let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.info(`Received ${signal}; closing the API server.`);

  server.close((error) => {
    database.close();
    if (error) {
      console.error('API server shutdown failed:', error);
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

server.on('error', (error) => {
  console.error('API server failed to start:', error);
  database.close();
  process.exitCode = 1;
});
