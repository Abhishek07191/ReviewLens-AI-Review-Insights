import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadServerEnvironment } from '../src/config/environment.js';

const environmentKeys = ['GROQ_API_KEY', 'GROQ_MODEL'];
let originalEnvironment: Record<string, string | undefined>;
let temporaryDirectory: string | undefined;

beforeEach(() => {
  originalEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  for (const key of environmentKeys) {
    delete process.env[key];
  }
});

afterEach(async () => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe('loadServerEnvironment', () => {
  it('loads server/.env before the root fallback and preserves process variables', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'reviewlens-env-'));
    const serverDirectory = join(temporaryDirectory, 'server');
    await mkdir(serverDirectory);
    await writeFile(join(serverDirectory, '.env'), 'GROQ_API_KEY=server-key\n');
    await writeFile(
      join(temporaryDirectory, '.env'),
      'GROQ_API_KEY=root-key\nGROQ_MODEL=root-model\n',
    );

    loadServerEnvironment(serverDirectory);

    expect(process.env.GROQ_API_KEY).toBe('server-key');
    expect(process.env.GROQ_MODEL).toBe('root-model');

    process.env.GROQ_API_KEY = 'process-key';
    loadServerEnvironment(serverDirectory);
    expect(process.env.GROQ_API_KEY).toBe('process-key');
  });

  it('loads Groq settings from the root .env.example as a final fallback', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'reviewlens-env-example-'));
    const serverDirectory = join(temporaryDirectory, 'server');
    await mkdir(serverDirectory);
    await writeFile(
      join(temporaryDirectory, '.env.example'),
      'GROQ_API_KEY=example-key\nGROQ_MODEL=example-model\n',
    );

    loadServerEnvironment(serverDirectory);

    expect(process.env.GROQ_API_KEY).toBe('example-key');
    expect(process.env.GROQ_MODEL).toBe('example-model');
  });
});
