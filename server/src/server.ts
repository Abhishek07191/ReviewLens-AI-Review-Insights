import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const port = Number.parseInt(process.env.PORT ?? '3001', 10);
const app = createApp();

app.listen(port, () => {
  console.info(`ReviewLens API listening on port ${port}`);
});
