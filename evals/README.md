# Spoon evals

Run: `./run.sh`. Extra args go to promptfoo, e.g. `./run.sh --filter-pattern dose`.

Run `npm test` for local assertion and release-metadata checks. These need only Node.js 22+ and make no model calls. GitHub Actions runs them on pull requests and pushes.

Run `SPOON_LIVE_EVALS=1 npm run test:session` for real Claude CLI session tests. They require a working `claude` login and use your model quota. Without the environment variable, these tests are skipped. The tests resume one isolated conversation to check sticky inheritance, temporary overrides, saved updates and reset, then verify that a fresh session starts empty. Separate cases remove subagent tools to check thoughtful verification and crystal self-review fallbacks. These session tests currently cover Claude CLI only; the main promptfoo suite still covers all four providers.

If Claude returns HTTP 403 because your organization has disabled subscription access for Claude Code, live tests cannot run with that subscription login. Use an authorized API key or have an organization administrator enable access before retrying.

To run fewer tools, keep one Claude tool in the filter, e.g. `--filter-providers 'codex|claude-cli'`. promptfoo stops if a Claude-only case has no Claude tool to run on.

Every case runs twice on 4 agent tools:
- **claude-cli**: `claude -p` (Sonnet 5.5). promptfoo has no built-in for it, so it lives in `provider.js`.
- **claude-sdk**: promptfoo's built-in `anthropic:claude-agent-sdk` (Sonnet 5.5)
- **codex**: `openai:codex-sdk`, with Codex's default model and your ChatGPT login
- **opencode**: `opencode:sdk`, with the free `big-pickle` model, because OpenCode has no Claude or OpenAI login here

Logins: Claude Code for both Claude tools, Codex (`~/.codex`) for Codex. OpenCode's free model needs none.

**Only this repo's spoon loads.** `run.sh` makes a temp workspace outside git. It links `skills/spoon` where each tool looks for project skills: `.claude/skills` for Claude, `.agents/skills` for Codex and OpenCode. User copies stay out:
- Claude loads only project settings.
- OpenCode's `~/.claude` lookup is turned off.
- Codex and OpenCode have no user spoon.

**Checks.** Most are promptfoo built-ins: `skill-used`, `word-count`, `regex`, `llm-rubric`. `asserts.js` holds only what has no built-in:
- every spoon file a tool used is in the workspace
- sentence count
- bold bullets
- an HTML file on disk
- the subagent count
- the transcript for the judge

The `ver1` and `ver3` cases run on Claude only, because the skill's subagent steps use Claude Code tools. So do the three *subagents* cases (`ver2`, `ver3`, `cr`): they check that a reply with subagents is a finished answer with the 🥄 last and no referee chatter in the body, and that it still fits the dose.

**Results.** `results/results.csv` (kept in git) has every answer with PASS/FAIL per tool. For cost, reasons and full transcripts: `npx promptfoo view`.
