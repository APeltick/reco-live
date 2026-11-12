<!-- ai-kit:begin — AI kit fields (spec/04 §5); an AI kit update changes only the text between the marks -->
## What was done

<briefly>

Tasks: <task numbers from tasks.md, for example 2.1, 2.2>
E2E: <e2e files related to the work — gate and the executor run them before the PR>
Test layers: <each new test file: path — layer (unit / integration / e2e); a new e2e — «why not lower: …», a new e2e file — also «why not a step: …»; or —>
Screenshots: <screen routes or —>
Proof: <what proves it: tests; a mutation check — the test turns red if the code is broken; bugfix — a red run before the fix and a green one after. The command output: a fenced block right under this line, before «Depends on:»>
Depends on: <#N of the parent PR or —>
Issue: <link>
Models: <tier→exact model ×N, for example standard→claude-sonnet-5-5 ×2>
<!-- For a bugfix: the place of the cause — the file and the line where the symptom comes from; for a feature — —. -->
Reason: <file:line — for a bugfix, where the cause is; for a feature —>

<!-- Where the change enters from: a route, a command, a hook, a job, an event, a call from another module — and what else it may touch. -->
## Door and blast radius

<who or what calls the changed code, and what else it may break — or —>

<!-- What it did before and what it does now; for a bugfix — the symptom and the fix. -->
## Before / after

<before → after, or —>

<!-- Only a spec PR that changes a change (proposal, design, specs, new tasks): the line «Change approved: <person>, <YYYY-MM-DD HH:MM>, OI-N» and on the next line a quote of the human's words «> <text of record OI-N>». Whoever adopted the PR changed the change themselves — one more such line from their own human. -->
<!-- Only a PR with an ADR: the line «ADR takes effect after merge» and the adr label — it is merged only with the human's approval: on the hosting or by their word «merge #N». -->

## How it affects colleagues

— <or, if the PR changes ai-team-docs/ or the AI kit: what changes for colleagues — from the manager's words before the PR; after merge the colleagues' watch passes it to their manager>

## Conflicts

— <or: files and how it was resolved on rebase>

## Decisions beyond the requirement

— <or: what was decided on our own, from DECISIONS of subagent reports>
<!-- ai-kit:end -->
