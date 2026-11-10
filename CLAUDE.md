# reco-live

<!-- ai-kit:begin — the AI kit section. The AI kit installer puts it into the project's CLAUDE.md; an AI kit update changes only the text between the marks. -->
## AI kit

The project is run by AI teams by AI kit: manager (the human talks to it), lead, executor-N, integrator-N, reviewer-N. Each human runs their own AI team; agreements between people — through the issue tracker, PRs and git. Everything that changes product behavior — only through an issue.

- **Terms** — only from the AI kit glossary (`GLOSSARY.md` in the AI kit folder of whoever runs the AI team): issue, change, task, task batch, brief, draft PR, `ai-review`, gate, merge group, returned PR, AI model tier, …
- **AI kit files in the project** — `ai-team-docs/` (the map — its `README.md`): flow settings `config/project-overlay.md`, roles and people `config/roles.md`, models `config/models.md`, MCP for agents `config/mcp.json` (each human has only the servers they enabled on their side), ATD — decisions on how the AI team works `atd/`.
- **Product behavior** — in the OpenSpec specs (`openspec/specs/`); "how and why" decisions on the product — the project's ADRs (`docs/adr/` or `adr_dir`). A decision is a file "how it is decided now", with its history next to it (`history/`); if it changes, the same file is edited with an entry in the history, the number stays. ADRs and ATDs are accepted only by the human; the same for a PR that changes the team rules (`ai-team-docs/config/`, `.github/ai-team/`, CI AI kit, this section, the project's Claude Code settings — `.claude/settings*.json`, `.claude/hooks/`, `.mcp.json`): it is merged only by the human's word with the PR number.
- **Each task in `tasks.md`** — with an AI model tier: `[strong]`, `[standard]` or `[light]`. The author puts `[x]` in their own PR.
- **Tests** — the lowest layer at which the check still catches the defect: unit / integration / e2e (spec/05 of AI kit).
- **PR** — a draft PR by the PR template (`Tasks:`, `E2E:`, `Test layers:`, `Screenshots:`, `Proof:`, `Depends on:`, `Issue:`, `Models:`). The review sets the `ai-review` status; the merge — by the project overlay; the integration branch is protected.
- **Secrets**: do not read or write `.env*` and `.secrets/` (examples — `.env.example` — are fine); variable names — `ai-team env-keys <file>`. In texts for the hosting (PRs, comments) — no secrets.
- **Processes**: your own servers — only `ai-team server start|stop`.

### Keep on compact
<!-- rare: needed only when the context is compacted -->

The agent id and role; the current task batch and brief; the tasks in work and their status; the branch, worktree, PR and PR dossier; the changed files; blockers and open questions; the last check command and its result; the decisions in this session.
<!-- ai-kit:end -->
