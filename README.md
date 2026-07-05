# JobPilot

Paste a job description → get your resume bullets rewritten to match it, streamed
token-by-token → save the application to a kanban tracker. Built as a real tool for
my own job hunt, and as a working demonstration of streaming-AI frontend patterns.

## Why this exists

Tailoring a resume to every JD is the highest-leverage, most tedious part of job
hunting. JobPilot automates the rewrite and keeps the pipeline organized — and it
doubles as a reference implementation of the frontend skills AI products need:
token streaming, interruptible generations, and optimistic local-first state.

## Architecture decisions

**Streaming over request/response.** The tailor endpoint returns a `ReadableStream`
consumed with `fetch` + `getReader()` on the client. Tokens render as they arrive,
the generation is cancellable mid-stream via `AbortController` (partial output is
kept, matching how users actually think about "stop"), and errors surface with a
retry path. No streaming library — the platform primitives are enough.

**Demo mode as a first-class citizen.** Without `ANTHROPIC_API_KEY`, the server
streams a realistic canned result token-by-token (with naive keyword extraction
from the JD). The deployed demo costs nothing to run, never breaks when a key
expires, and exercises the identical client code path as live mode. With a key,
the same route streams from the Anthropic API (`claude-opus-4-8`). The response's
`X-Tailor-Mode` header tells you which you got.

**Local-first storage.** Resume text and tracked applications live in
`localStorage`. For a single-user tool this removes auth, a database, and a whole
class of privacy questions — your resume never leaves your browser in demo mode.
The store module is 20 lines and swappable for a real backend when multi-device
sync matters.

## Run it

```bash
npm install
npm run dev            # demo mode
ANTHROPIC_API_KEY=sk-... npm run dev   # live tailoring
```

**Zero-dependency interactions.** Board drag-and-drop uses the native HTML5 DnD
API, with the move buttons kept as the keyboard- and touch-accessible path to the
same action. The ⌘K command palette (navigation + fuzzy search over tracked
applications) is ~100 lines with proper combobox/listbox semantics, focus
restoration, and Escape handling — no cmdk, no dnd-kit.

## Roadmap

- Virtualized board columns for hundreds of applications
- Follow-up reminders per application
- Real DB + auth when multi-device sync matters
