const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { oneSentence, twoSentences, boldBullets, cleanAnswer, samplingRan } = require('./asserts');

test('sentence checks ignore the footer and enforce the dose', () => {
  assert.equal(oneSentence('A mutex protects shared data.\n🥄 1 sentence').pass, true);
  assert.equal(oneSentence('One. Two. Three.\n🥄 1 sentence').pass, false);
  assert.equal(oneSentence('One.\nTwo.\n🥄 1 sentence').pass, false);
  assert.equal(twoSentences('One. Two.\n🥄 2 sentences').pass, true);
  assert.equal(twoSentences('One.\n🥄 2 sentences').pass, false);
});

test('bullet checks require multiple bullets with short bold titles', () => {
  assert.equal(boldBullets('- **Shared access:** Coordinate work.\n- **Safe updates:** Avoid collisions.\n🥄 bullets').pass, true);
  assert.equal(boldBullets('- Shared access\n- Safe updates\n🥄 bullets').pass, false);
});

test('finished answers require a final footer and completed work', () => {
  assert.equal(cleanAnswer('Zero is even.\n🥄 verified: consensus').pass, true);
  assert.equal(cleanAnswer('Zero is even.').pass, false);
  assert.equal(cleanAnswer('Agents are still running.\n🥄').pass, false);
  assert.equal(cleanAnswer('🥄\nMore commentary.').pass, false);
});

test('sampling requires real subagent calls as well as a sampling footer', () => {
  const answer = 'A checked answer.\n🥄 verified: sampling';
  assert.equal(samplingRan(answer, {}).pass, false);
  assert.equal(samplingRan(answer, { metadata: { toolCalls: [{ name: 'Agent' }] } }).pass, true);
  assert.equal(samplingRan(answer, { metadata: { toolCalls: [{ name: 'Read' }] } }).pass, false);
});

test('plugin and marketplace versions match the skill release', () => {
  const root = path.resolve(__dirname, '..');
  const skill = fs.readFileSync(path.join(root, 'skills/spoon/SKILL.md'), 'utf8');
  const version = skill.match(/^  version: "([^"]+)"$/m)?.[1];
  assert.ok(version, 'Skill metadata must contain a version');
  const plugin = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));
  const marketplace = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'));
  assert.equal(plugin.version, version);
  assert.equal(marketplace.plugins.find((p) => p.name === 'spoon').version, version);
});
