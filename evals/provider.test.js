const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ClaudeCli = require('./provider');

let workspace;
const originalPath = process.env.PATH;
before(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'spoon-provider-'));
  fs.writeFileSync(path.join(workspace, 'claude'), `#!${process.execPath}
const scenario = process.argv[3];
const emit = (event) => console.log(JSON.stringify(event));
if (scenario === 'timeout') {
  setInterval(() => {}, 1000);
} else if (scenario === 'exit') {
  console.error('Please log in first');
  emit({ type: 'result', result: 'partial answer' });
  process.exitCode = 1;
} else if (scenario === 'signal') {
  process.kill(process.pid, 'SIGTERM');
} else if (scenario === 'error-result') {
  emit({ type: 'result', is_error: true, errors: ['Maximum turns reached'] });
} else if (scenario === 'no-result') {
  console.log('not JSON');
  console.error('CLI setup failed');
} else {
  console.log('not JSON');
  emit({ type: 'assistant', message: { content: [
    { type: 'tool_use', id: 'read-1', name: 'Read', input: { file_path: 'SKILL.md' } }
  ] } });
  emit({ type: 'user', message: { content: [
    { type: 'tool_result', tool_use_id: 'read-1', content: 'skill content' }
  ] } });
  emit({ type: 'result', result: 'intermediate answer' });
  emit({ type: 'result', result: 'final answer', total_cost_usd: 0.01 });
}
`, { mode: 0o755 });
  process.env.PATH = workspace;
});
after(() => {
  process.env.PATH = originalPath;
  fs.rmSync(workspace, { recursive: true, force: true });
});

const call = (scenario, config = {}) => new ClaudeCli({ config: {
  model: 'test', effort: 'medium', allowed_tools: ['Read'], timeout_s: 2, ...config,
} }).callApi(scenario);

test('uses the last result and preserves cost and tool metadata', async () => {
  const result = await call('success');
  assert.equal(result.output, 'final answer');
  assert.equal(result.cost, 0.01);
  assert.equal(result.metadata.toolCalls[0].output, 'skill content');
  assert.equal(result.error, undefined);
});

test('reports nonzero exit status and stderr instead of a partial answer', async () => {
  const result = await call('exit');
  assert.match(result.error, /exit code 1/);
  assert.match(result.error, /Please log in first/);
  assert.equal(result.output, undefined);
});

test('reports CLI error results even when the exit status is zero', async () => {
  const result = await call('error-result');
  assert.match(result.error, /Maximum turns reached/);
  assert.equal(result.output, undefined);
});

test('includes stderr when the CLI emits no result', async () => {
  const result = await call('no-result');
  assert.match(result.error, /no result/);
  assert.match(result.error, /CLI setup failed/);
});

test('reports signal termination', async () => {
  const result = await call('signal');
  assert.match(result.error, /SIGTERM/);
});

test('terminates a timed-out CLI and returns an actionable error', async () => {
  const result = await call('timeout', { timeout_s: 0.1 });
  assert.match(result.error, /timed out after 0.1s/);
});

test('returns a provider error when the CLI executable is missing', async () => {
  fs.renameSync(path.join(workspace, 'claude'), path.join(workspace, 'claude-disabled'));
  try {
    const result = await call('success');
    assert.match(result.error, /ENOENT/);
  } finally {
    fs.renameSync(path.join(workspace, 'claude-disabled'), path.join(workspace, 'claude'));
  }
});
