# Utilities

## Tokens

- `tips` or `cheatsheet` — quick start, see below.
- `sticky on` — keep the current arguments for the rest of the session.
- `sticky off` — stop keeping them.

## Sticky preferences

Keep one set of saved preferences in the current conversation only. Start new conversations with an empty set. Resolve conflicting tokens using the main skill's argument rules.

1. With sticky mode active, begin each response with the saved preferences. Explicit tokens replace their categories for that response; other saved categories remain active.
2. `sticky on` saves the resulting preferences for later turns, replacing the previous saved set. Save settings such as dose, verification, format and enhancers; `tips` and the sticky command itself are actions, not saved settings. With no settings and no previous set, save an empty set and keep Spoon active.
3. Without a sticky command, overrides last for this response only. For example, after `sp 1s lay sticky on`, `sp 2p` means 2 paragraphs for this answer; the next answer returns to 1 sentence for a layman.
4. `sticky off` clears the saved set before answering the current turn. Apply only explicit tokens from that turn. For `sp sticky off`, briefly confirm the reset and end with the bare 🥄 footer; later replies use normal behavior until another invocation.
5. If both sticky commands appear, the last one wins. The footer describes the effective settings for this response and includes `sticky` only while sticky mode remains active.

## Tips

Reply with the basics, then offer more. Keep it short.

**The basics**

- Dosing sets the length. `sp 1m` → a 1-minute read. `sp 2s` → two sentences.
- Verification checks the answer. `sp ver` → Spoon picks the level. `sp ver1` → thoughtful, `sp ver2` → a few key claims checked by subagents, `sp ver3` → two models must agree.
- Tokens combine: `sp 1m ver`.

End with: "Want more advanced tips?"

**Advanced** (only if the user says yes)

- Formats: `bul` → a few bullets with bold titles, `art` → an artifact, `html` → an HTML page.
- Enhancers: `cr` → crystal clear, `lay` → for a layman, `da` → backed with data, `in` / `out` → more / less detail, `qu` → ask a question first.
- Verification by name: `thoughtful`, `sampling`, `consensus` (or `tho`, `sam`, `con`).
- `sticky on` → keep the arguments for the session, `sticky off` → stop.
- Example: `sp 1m bul ver3` → a 1-minute read, in bullets, with consensus.
