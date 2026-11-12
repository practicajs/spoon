// Opt-in integration tests: real Claude CLI sessions, using the locally installed skill.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { oneSentence } = require('./asserts');

const exec = promisify(execFile);
const live = process.env.SPOON_LIVE_EVALS === '1';
const footer = (out) => out.trim().split('\n').at(-1);
const paragraphs = (out) => out.trim().split('\n').filter((line) => !line.trim().startsWith('🥄')).join('\n').trim().split(/\n\s*\n/);

function workspace(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'spoon-session-')));
  const skills = path.join(dir, '.claude/skills');
  fs.mkdirSync(skills, { recursive: true });
  fs.symlinkSync(path.resolve(__dirname, '../skills/spoon'), path.join(skills, 'spoon'), 'dir');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

async function ask(dir, prompt, session) {
  const args = ['-p', prompt, '--setting-sources', 'project', '--output-format', 'json',
    '--tools', 'Read,Skill', '--allowedTools', 'Read,Skill'];
  if (session) args.push('--resume', session);
  const pending = exec('claude', args, {
    cwd: dir, timeout: 180000, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024,
  });
  pending.child.stdin.end();
  let stdout;
  try {
    ({ stdout } = await pending);
  } catch (error) {
    let detail;
    try { detail = JSON.parse(error.stdout).result; } catch { /* Use the process error below. */ }
    throw new Error(`Claude CLI session failed: ${detail || error.stderr || error.message}`);
  }
  const result = JSON.parse(stdout);
  assert.ok(!result.is_error, JSON.stringify(result));
  assert.equal(typeof result.result, 'string');
  assert.ok(result.session_id, 'CLI must expose a resumable session ID');
  return { out: result.result, session: result.session_id };
}

test('sticky settings persist, allow temporary overrides, update and reset', { skip: !live }, async (t) => {
  const dir = workspace(t);
  let session;
  const turn = async (prompt) => {
    const result = await ask(dir, prompt, session);
    session = result.session;
    return result.out;
  };
  const steps = [
    ['save preferences', 'Explain a mutex. sp 1s lay sticky on', 1],
    ['inherit without a command', 'Explain a semaphore.', 1],
    ['override for one response', 'Explain a queue. sp 2p', 2],
    ['restore saved preferences', 'Explain a stack.', 1],
    ['save an updated dose', 'Explain a tree. sp 2p sticky on', 2],
    ['inherit the updated dose', 'Explain a graph.', 2],
  ];
  for (const [name, prompt, dose] of steps) {
    t.diagnostic(name);
    const out = await turn(prompt);
    assert.match(footer(out), /🥄.*sticky/);
    assert.match(footer(out), /layman/i);
    if (dose === 1) {
      assert.match(footer(out), /1 sentence/);
      assert.equal(oneSentence(out).pass, true, out);
    } else {
      assert.match(footer(out), /2 paragraphs/);
      assert.equal(paragraphs(out).length, 2, out);
    }
  }
  t.diagnostic('clear before the current reply');
  assert.equal(footer(await turn('sp sticky off')), '🥄');
  t.diagnostic('normal behavior after reset');
  assert.equal((await turn('Reply with exactly RESET_OK.')).trim(), 'RESET_OK');
  // Leave this conversation sticky, then start a separate session in the same workspace.
  t.diagnostic('new conversations start without sticky settings');
  await turn('Explain a list. sp 1s sticky on');
  const fresh = await ask(dir, 'Reply with exactly NEW_SESSION_OK.');
  assert.notEqual(fresh.session, session);
  assert.equal(fresh.out.trim(), 'NEW_SESSION_OK');
});

test('verification and crystal disclose fallback when subagents are unavailable', { skip: !live }, async (t) => {
  const dir = workspace(t);
  await t.test('consensus falls back to thoughtful', async () => {
    const { out } = await ask(dir, 'Is zero even? sp 1s ver3');
    assert.match(out, /⚠️/);
    assert.match(footer(out), /verified: thoughtful/);
    assert.doesNotMatch(footer(out), /consensus|sampling/);
  });
  await t.test('crystal uses disclosed self-review', async () => {
    const { out } = await ask(dir, 'Explain a mutex. sp 1s cr');
    assert.match(out, /⚠️/);
    assert.match(footer(out), /self-reviewed/);
  });
});
