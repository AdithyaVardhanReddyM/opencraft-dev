# Agent Context Architecture

> Design for what goes into the UI coding agent on every user prompt, and how
> context from previous edits is carried forward — optimized for token
> efficiency, low latency, and correctness.
>
> **Status:** design agreed, not yet built. This doc is the spec we implement later.

---

## Goal

On a follow-up prompt, feed the agent the **smallest set of high-signal tokens**
that lets it edit the right file correctly in as few inferences as possible.

- Do **not** dump the whole codebase every turn (the "Bolt trap" — burns 100k+
  tokens and rots attention).
- Do **not** under-feed it either (today's failure: a scattered, partial file
  list forces the agent to rediscover state, wasting turns).
- Keep the bulk of the window in the **prompt cache** (≈0.1× cost on replay) and
  pay full price only for what genuinely changes each turn.

---

## Mental model: three layers

```
┌─ LAYER 1: IDENTITY ───────────────────────────── [CACHED, stable] ─┐
│  • system prompt core                                              │
│  • tool definitions                                                │
│  → never rebuilt mid-session; changing it invalidates the cache    │
├─ LAYER 2: HISTORY ──────────────────────── [CACHED, append-only] ──┤
│  • EVERY turn for this screen: user prompt + short task summary     │
│  • per-screen threads are short, each entry is tiny → no windowing  │
│  • append-only ⇒ all prior turns stay a stable cacheable prefix     │
├─ LAYER 3: PROJECT STATE ────────────────── [VOLATILE, fresh/turn] ─┤
│  • active-screen anchor (which route/file this thread edits)        │
│  • repo-map: every file as `path — one-liner`, edited files marked  │
│  → recomputed each turn, wrapped INSIDE the current user turn       │
└────────────────────────────────────────────────────────────────────┘
        + the current user message
```

**Key structural rule:** Layer 3 is injected as part of the *current user turn*,
not as a free-floating system message. That keeps the message history strictly
append-only, so everything before this turn replays from cache. Full price is
paid only for Layer 3 + the new prompt.

### On history (Layer 2): append everything

A single screen does not have long back-and-forth. Each history entry is just a
prompt + a 1–3 sentence summary (tiny). So we append **all** turns for the
screen — no 3–4 turn cap, no rolling digest, no windowing logic. The whole
thread stays cheap and is a clean cached prefix.

> If, in practice, some screens ever grow very long and early decisions scroll
> out of useful range, the lightest fix is a single 2–3 line "sticky
> constraints" note (e.g. "user wants a brutalist dark theme, brand #ff5500").
> Do **not** build this now — only if it actually bites.

---

## The exact per-turn payload

```
1. [CACHED] system prompt + tool defs
       (the system prompt already names the semantic theme tokens —
        bg-background, bg-primary, … — which is why we do NOT inject globals.css)

2. [CACHED, append-only] history — all turns for this screen:
       User: "build a SaaS landing page"
       Assistant: "Built a landing page with hero, features, pricing, footer."
       User: "add a pricing page"
       Assistant: "Added /pricing with a 3-tier comparison table."

3. [VOLATILE] active-screen anchor:
       This conversation edits the screen at route "/" → app/page.tsx.
       Scope edits here unless the user says otherwise.

4. [VOLATILE] repo-map — every file, paths + one-liner only, NO contents:
       app/page.tsx — landing page (hero, features, pricing, footer)
       app/pricing/page.tsx — /pricing, 3-tier comparison table
     ▸ components/hero.tsx — Hero (animated headline, CTAs)     ⟵ edited last turn
       components/pricing-table.tsx — PricingTable(plans[])
       lib/utils.ts — cn() helper
       app/globals.css — theme tokens + Tailwind v4 config

5. current user prompt (+ images if any)
```

That is the entire context. **No file contents are injected.** The agent reads
the files it needs on demand via `readFiles`.

---

## Repo-map spec (Layer 3, the only state signal)

Because no file contents are injected, the repo-map must earn its tokens.

- **One line per file:** `path — one-liner purpose`.
- **Edited markers:** files changed in the previous turn are marked (`▸ … ⟵
  edited last turn`). This points the agent's single `readFiles` straight at the
  hot file with zero injected content.
- **Component signatures (enrichment):** for components, append the exported
  symbol + key props, e.g. `PricingTable(plans[])`. Lets the agent *reuse*
  components correctly without reading them — high value for a UI agent, still
  one line. Fold in whenever convenient.
- Built fresh each turn from `screen.files` keys ∪ `fileMeta` (see below), so it
  is **always complete and current** — this is what fixes today's partial/stale
  file list.

### Active-screen anchor

A canvas screen maps to a page/route, and flow builds add routes to the *same*
shared app — so a follow-up could target any page. The anchor states which page
this thread edits, removing all ambiguity and ensuring the agent's first read
lands on the right file. ~15 tokens, high leverage.

---

## What the agent returns

The agent returns only the **delta** — what it changed. The harness owns and
maintains the repo-map; the agent never re-emits the whole map (that would waste
output tokens and invite drift).

```xml
<title>Pricing Page</title>          <!-- first build only; omit on follow-ups -->

<changes>                            <!-- ONLY files touched this turn -->
- updated  components/hero.tsx — larger headline, added "Watch demo" CTA
- created  components/video-modal.tsx — demo video dialog (props: open, onClose)
</changes>

<summary>                            <!-- 1–3 sentences, human-readable -->
Made the hero headline larger and added a secondary "Watch demo" button that
opens a video modal.
</summary>
```

| Agent returns | Where it goes | Replayed in history? |
|---|---|---|
| `<changes>` (path + one-liner per file) | merged into `fileMeta` → rebuilds the repo-map | ❌ no |
| `<summary>` (1–3 sentences) | the assistant entry in history | ✅ yes |
| `<title>` (first turn only) | screen title | ❌ no |

Clean separation of concerns:
- **repo-map** answers "what exists and what it does" (current state).
- **history** answers "what we did and why" (narrative).
- No duplication between them.

---

## End-of-turn persistence loop

```
agent completes  →  harness:
  • screen.files   ← full path→content map         (sandbox mirror, ground truth)
  • fileMeta       ← merge <changes>: path → one-liner (created/updated/deleted)
  • history        ← append { user prompt, <summary> }   (short summary only)
  • recentEdits    ← set to the paths in <changes>        (for next map's ▸ marker)

next turn → rebuild active-anchor + repo-map from fileMeta + recentEdits → top
```

Each turn's per-file descriptions become the next turn's repo-map; the short
summary keeps history lean; the full file map lives in `screen.files` but is
*projected down* to a paths-only map, never replayed wholesale.

---

## The one tradeoff (accepted)

Paths-only means **each edit costs one `readFiles` round-trip** (an extra
inference) before the agent can change a file. That is the price of not
pre-injecting content, and it is the right trade: no tokens wasted guessing the
wrong file to inject, simpler, predictable.

The edited-markers + active-anchor + component-signatures keep that read
**single and precise** — the agent reads exactly one file, edits, done. We trade
a little latency for token efficiency and correctness, which is right for an
iterative UI tool.

---

## Token characteristics

| Layer | Cost |
|---|---|
| system + tools | cached (0.1× on replay) |
| history (all turns, prompt + short summary) | cached, append-only (0.1×) |
| active-anchor + repo-map | full, fresh each turn (~0.5–1k) |
| user message | full (~0.1k) |
| **fresh tokens paid per turn** | **~2–4k** |

**Flat in project size** — a 100-file app costs about the same as a 10-file one,
because only the repo-map grows (cheaply) and no file contents are injected.

---

## Data we need to persist (schema additions)

- `screen.fileMeta: Record<path, { description: string; updatedAt: number; status: "active" | "deleted" }>`
  — source of the repo-map one-liners.
- `screen.recentEdits: string[]` — paths edited last turn, for the `▸` marker.
- `screen.route` / active path — already present; drives the active-screen anchor.
- assistant message content — store the **short `<summary>` only** (stop storing
  the giant task_summary + files_summary blob).

---

## What changed vs. today

| Today | New design |
|---|---|
| Partial file list scattered across `files_summary` blobs in messages | Complete, fresh repo-map every turn from `fileMeta` |
| Agent rediscovers file list via `ls`/reads | Repo-map + edited-markers + active-anchor → one precise read |
| Giant task_summary + files_summary stored in each message | Short summary in history; structured changes feed the map |
| No notion of "which screen am I editing" | Explicit active-screen anchor |
| Risk of staleness (summary drifts from disk) | Map rebuilt from current file state each turn |

---

# Tools

The agent's tool set. Existing tools are kept; new tools are marked **(NEW)**.
The guiding principle: a small, non-overlapping set, each with a clear "when to
use," plus a **harness-enforced verification gate** the model cannot skip.

## Full tool set

| Tool | Status | Purpose |
|---|---|---|
| `terminal` | existing | Run shell commands (install packages, file ops, run `tsc`). |
| `createFiles` | existing (renamed role) | Write **complete** files — primarily for **new** files. |
| `editFile` | **NEW** | Targeted **search-replace** edits to existing files (no full rewrite). |
| `readFiles` | existing | Read full file contents. Load-bearing under paths-only context. |
| `searchProject` | **NEW** | grep/regex across the project — locate a symbol/string without reading whole files. |
| `scrapeWebpage` | existing | Firecrawl scrape a URL for recreation/clone/inspiration. |

> Gated behind **Visual Mode** (off by default; build deferred):
> `screenshotPreview` and `readPreviewLogs` — see **Visual Mode** below.

---

## Tier 1 — highest leverage

### `editFile` (NEW) — targeted search-replace

Make small edits to an existing file without rewriting it. This is the **default
for follow-up edits** and pairs directly with the read-on-demand context model
(read → replace exact strings), saving output tokens and latency vs. re-emitting
a whole file.

```
parameters:
  path: string                     // file to edit (relative path)
  edits: Array<{
    oldString: string              // exact text to find (must be UNIQUE in file)
    newString: string              // replacement
    replaceAll?: boolean           // optional; default false
  }>

returns:
  per-edit result. On failure, the reason:
    - "oldString not found"        → agent re-reads and retries
    - "oldString not unique"       → agent supplies more surrounding context
```

- Use `editFile` for modifying existing files; use `createFiles` for new files
  (or a genuine full rewrite).
- `oldString` must match the file byte-for-byte including indentation, and be
  unique — otherwise the edit is rejected (no silent partial application).
- The agent should have the file's current contents (from `readFiles` or because
  it just wrote it) before calling this.

---

## Tier 2 — solid, cheaper wins

### Enforced typecheck / lint gate (harness mechanism, not a model tool)

Today `tsc --noEmit` is run via `terminal` only because the prompt *asks* the
model to — which it can skip, shipping a broken build. Make it a **precondition
the harness enforces** before accepting `<task_summary>`:

```
verification gate (runs when the model tries to finish):
  1. tsc --noEmit  (+ eslint)   → if errors: reject completion, re-prompt with
                                   the error output; agent must fix and retry
  → only when step 1 is clean is <task_summary> accepted and the run allowed
    to end.
```

- Implemented on top of `terminal` (for `tsc`/lint), but **driven by the network
  router**, not left to model discretion.
- Note: fix-retry iterations add to the budget — keep `maxIter` headroom so a
  file with several type errors can be fixed without being cut off.
- When **Visual Mode** is on (see below), a visual self-check slots in here as a
  second gate step after typecheck passes.

### `searchProject` (NEW) — grep/regex over the project

Locate where a symbol, className, import, or string lives without reading whole
files. Complements paths-only context: cheaper than `cat`-ing candidates.

```
parameters:
  query: string                    // literal or regex
  pathGlob?: string                // optional scope, e.g. "components/**"
  maxResults?: number              // default a sane cap

returns:
  matches as `path:line — snippet` (high signal, low token)
```

- Use to answer "where is the theme defined", "which files import `Hero`",
  "where is this color used" before deciding what to `readFiles` or `editFile`.

---

## Visual Mode (mode-gated tools)

The two visual tools are **not part of the default tool set**. They are gated
behind an explicit **Visual Mode** flag, **off by default**. When Visual Mode is
on, the agent gains `screenshotPreview` + `readPreviewLogs` and the verification
gate runs a visual self-check step; when off, only the lean core set runs and no
image tokens are ever spent.

**Why gate it:** screenshots are images (expensive multimodal tokens) and the
visual loop adds iterations. Most edits ("change the color", "add a button")
don't need the agent to *see* the result; only visual debugging ("the layout is
broken, fix it") does. Gating keeps the common path cheap and reserves the heavy
path for when it pays off.

### How the mode works

Flipping Visual Mode coordinates **three** things together:

1. **Tool set** += `screenshotPreview`, `readPreviewLogs`.
2. **Verification gate** += a visual self-check step (after typecheck passes:
   screenshot → feed image back → fix, cap ~3 iterations).
3. **System prompt** += a `visualModeAddendum` teaching those tools — the same
   conditional-append pattern as the existing `flowSystemAddendum`.

- **Default off** → core 6-tool set, typecheck-only gate.
- **Trigger:** manual **per-turn** user toggle is the v1 default (predictable,
  most token-efficient — "look at *this* result", then back off). Optionally
  auto-enable on the first full-page build. Avoid clever auto-heuristics for now.
- **Cache caveat:** tools sit at the front of the cached prefix, so toggling the
  mode busts the cache on the turn it flips. This is a **one-time cost per
  toggle, not per turn** — fine as long as the mode isn't flipped frivolously
  mid-session (e.g. don't auto-toggle every turn).

**Build status:** the *build* is still deferred. Gating solves the **token**
cost, not the **infra** cost — Visual Mode needs the headless-browser infra below
whenever it's built. Designed now so it slots in cleanly later: the verification
gate already has the seam for the visual step.

Both tools need the **same new infra** — a headless browser pointed at the
sandbox preview URL (`getHost(3000)` + route).

### `screenshotPreview` (Visual Mode) — visual feedback

Render the live preview and return it to the model as an image, so it can verify
its own output and self-correct spacing, overlap, contrast, alignment, and
responsive layout — the class of problems `tsc` cannot catch.

```
parameters:
  route?: string                   // default: the active-screen route
  viewport?: "desktop" | "mobile"  // default: desktop; mobile for responsive checks
  fullPage?: boolean               // default: false

returns:
  an image of the rendered page (passed back as multimodal content)

mechanism:
  headless browser → sandbox preview URL (getHost(3000) + route) → screenshot
```

When built, this is **harness-driven, not free-form**: the verification gate
triggers it after typecheck passes, feeds the image back ("check
spacing/overlap/contrast/alignment; fix or confirm done"), and caps the loop at
**~3 iterations** (gains saturate, screenshots are token-heavy).

### `readPreviewLogs` (Visual Mode) — console + network capture

Capture runtime console errors/warnings and failed network requests from the
rendered preview. Catches crashes that neither `tsc` nor a screenshot explains —
hydration errors, runtime-undefined imports, blank-screen exceptions, 404s.

```
parameters:
  route?: string                   // default: active-screen route

returns:
  { consoleErrors: string[], consoleWarnings: string[], failedRequests: string[] }
```

Pairs with `screenshotPreview`: when the page renders blank/broken, pull the logs
to see *why*.

> **Excluded entirely** (not merely deferred): a shadcn component-registry
> retrieval tool. shadcn is baked into the sandbox template, and component
> signatures in the repo-map already cover reuse — so a dedicated registry tool
> is not worth the surface area.

---

## Existing tools (unchanged, for reference)

- **`terminal`** — run shell commands. Still forbidden: `npm run dev/build/start`
  / `next dev/build/start` (the dev server runs with HMR already).
- **`createFiles`** — write complete files. Now scoped to **new files / full
  rewrites**; small edits go through `editFile`.
- **`readFiles`** — read full contents. Now the primary way the agent pulls
  state under paths-only context; usually one precise read per edit, guided by
  the repo-map's edited-markers + active-screen anchor.
- **`scrapeWebpage`** — Firecrawl scrape for recreation. Only when the user
  provides a URL to recreate/clone/redesign.

---

## How the tools fit the loop

```
user prompt + context (system, history, repo-map, active-anchor)
        │
        ▼
  agent reasons → searchProject / readFiles  (locate + load just what it needs)
        │
        ▼
  editFile (existing) | createFiles (new)    (+ terminal for installs)
        │
        ▼
  VERIFICATION GATE (harness-enforced):
    tsc/lint clean
        │  (fail → re-prompt, agent fixes, loop)
        ▼
  agent emits <changes> + <summary> + <title?>  →  persistence loop
```

This keeps reads precise (Tier 2 search), edits cheap (Tier 1 search-replace),
and "done" honest (Tier 2 enforced typecheck gate) — without injecting file
contents into context. The visual self-correction loop slots in at the
verification gate when **Visual Mode** is enabled.
