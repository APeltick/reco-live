## Why

Reviewer-1 found a stale path on PR #140 (the AI kit update to 0.3.1-dev, merged as b711bdb), non-blocking. AI kit 0.3.1-dev moved the decision templates into module folders (DEC-0125 of AI kit). `ai-team-docs/atd/README.md:5` still names them `templates/decisions/` of AI kit; they are now `modules/decisions/templates/decisions/` (the kit's own ATD README template says so: `modules/decisions/templates/project/ai-team-docs/atd/README.md:5`). The operator asked for a separate PR (OI-741) and opened #141 (OI-744). On the spec PR #142 reviewer-1 found the same old path in the project's ADR template, `docs/adr/0000-template.md:2` (the kit update #140 did not refresh it); the operator chose to fix it in this change too (OI-760).

## What Changes

- `ai-team-docs/atd/README.md:5`: `templates/decisions/` → `modules/decisions/templates/decisions/`. The rest of the project's own text (in Russian) stays as is; the ATD index block is untouched.
- `docs/adr/0000-template.md:2` (the comment at the top of the ADR template): `templates/decisions/full.md and minimal.md` → `modules/decisions/templates/decisions/full.md and minimal.md`. Nothing else in the template changes.

Docs only (`skip_specs: true`).

## Capabilities

### New Capabilities

— none

### Modified Capabilities

— none

## Impact

- Changed: `ai-team-docs/atd/README.md`, `docs/adr/0000-template.md` (one comment line each). No code, no config, no ATD or ADR content.
- Colleagues: doc links only; nothing changes in how anyone works.
