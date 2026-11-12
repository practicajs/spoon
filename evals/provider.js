// Claude Code CLI (`claude -p`) as a promptfoo provider. promptfoo has no built-in for the CLI.
// It returns the same metadata shape as the built-in agent providers (toolCalls, skillCalls),
// so the asserts work on every provider.
const { spawn } = require('child_process');

class ClaudeCli {
  constructor(options = {}) {
    this.config = options.config || {};
    this.label = options.label;
  }
  id() { return 'claude-cli'; }

  callApi(prompt, context) {
    const c = this.config;
    const maxTurns = context?.vars?.max_turns;
    const args = ['-p', prompt, '--model', c.model, '--effort', c.effort,
      '--setting-sources', 'project', '--output-format', 'stream-json', '--verbose',
      '--allowedTools', c.allowed_tools.join(','), ...(maxTurns ? ['--max-turns', String(maxTurns)] : [])];

    return new Promise((resolve) => {
      const p = spawn('claude', args, { cwd: c.working_dir, stdio: ['ignore', 'pipe', 'pipe'] });
      const timeout = c.timeout_s || 480;
      const timer = setTimeout(() => {
        p.kill('SIGKILL');
        resolve({ error: `claude -p timed out after ${timeout}s` });
      }, timeout * 1000);
      let raw = '';
      let stderr = '';
      p.stdout.on('data', (d) => { raw += d; });
      p.stderr.on('data', (d) => { stderr = (stderr + d).slice(-4000); });
      p.on('error', (error) => {
        clearTimeout(timer);
        resolve({ error: `Could not start claude -p: ${error.message}` });
      });
      p.on('close', (code, signal) => {
        clearTimeout(timer);
        const failure = (message) => resolve({ error: `${message}${stderr.trim() ? `: ${stderr.trim()}` : ''}` });
        if (signal) return failure(`claude -p terminated by ${signal}`);
        if (code !== 0) return failure(`claude -p exited with exit code ${code}`);
        const events = raw.split('\n').flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
        // With background subagents, -p can emit several results; the last one is the answer.
        const result = events.filter((e) => e.type === 'result').pop();
        if (!result) return failure('claude -p returned no result');
        if (result.is_error) return failure(`claude -p failed: ${result.errors?.join('; ') || result.result || result.subtype || 'unknown error'}`);
        resolve({ output: result.result || '', cost: result.total_cost_usd, metadata: toMetadata(events) });
      });
    });
  }
}

function toMetadata(events) {
  const calls = new Map();
  const skillCalls = [];
  for (const e of events) {
    for (const b of Array.isArray(e.message?.content) ? e.message.content : []) {
      if (b.type === 'tool_use') calls.set(b.id, { id: b.id, name: b.name, input: b.input, parentToolUseId: e.parent_tool_use_id });
      if (b.type === 'tool_result' && calls.has(b.tool_use_id)) {
        calls.get(b.tool_use_id).output = typeof b.content === 'string' ? b.content : (b.content || []).map((x) => x.text || '').join('\n');
      }
      // The CLI says where a skill was loaded from right after the Skill call.
      const dir = b.type === 'text' && e.type === 'user' && b.text.match(/^Base directory for this skill: (\S+)/);
      if (dir) skillCalls.push({ name: dir[1].split('/').pop(), path: `${dir[1]}/SKILL.md`, source: 'tool' });
    }
  }
  return { toolCalls: [...calls.values()], skillCalls };
}

module.exports = ClaudeCli;
