import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

let profile = null;
const scriptArgs = [];

for (let index = 0; index < args.length; index += 1) {
  const value = args[index];
  if (value === '--profile') {
    profile = args[index + 1] || null;
    index += 1;
    continue;
  }
  scriptArgs.push(value);
}

const [scriptPath] = scriptArgs;

if (!scriptPath) {
  process.stderr.write(
    'Usage: node api/load-tests/run-k6.js [--profile <name>] <script>\n'
  );
  process.exit(1);
}

const versionResult = spawnSync('k6', ['version'], {
  stdio: 'pipe',
  encoding: 'utf8',
  shell: true
});

if (versionResult.status !== 0) {
  process.stderr.write(
    [
      'k6 is required to run load tests but is not installed or not on PATH.',
      'Install k6 locally or in CI, then rerun the load-test command.',
      'Windows install example: choco install k6',
      'Docs: https://grafana.com/docs/k6/latest/set-up/install-k6/'
    ].join('\n') + '\n'
  );
  process.exit(1);
}

const env = { ...process.env };
if (profile) {
  env.LOAD_PROFILE = profile;
}

const runResult = spawnSync('k6', ['run', scriptPath], {
  stdio: 'inherit',
  env,
  shell: true
});

process.exit(runResult.status ?? 1);
