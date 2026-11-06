<!--
The project's ADR template (DEC-0091 of the AI kit; the same as templates/decisions/full.md and minimal.md of the AI kit).
The file is ADR-NNNN-<slug>.md in this folder. NNNN is the next free number: "ai-team adr-next" (it takes into account the open PRs
of colleagues). <slug> — short, in English, with hyphens.

The template "full" — when there were options in the conversation with the human; if there were none — "minimal": in the header
"Template: minimal", no sections "Options" and "Related" (related decisions — an item in "Consequences"). Do not invent options.

Next to it — the history: history/<the same file> with one "accepted" entry:

# ADR-NNNN · <question — as in the title of the decision> — history

Newest entries first.

## <YYYY-MM-DD> · <author: the id of the human who accepted the decision> · accepted

**Why:** <one or two sentences: why the decision was needed>

To change a decision — edit this same file ("Changed:" — the date) and add an entry on top of the history
"## <YYYY-MM-DD> · <author> · changed" with "**Why:**" and "**Was (before <YYYY-MM-DD>):**" — the full previous text in a quote
("> " at the start of every line; the process guard compares it with the text before the edit, spaces and HTML comments do not count).
Earlier entries are not edited. Revoking — the status "revoked" and an entry "revoked" with "Why".
The file is not deleted, the number does not change. The index — "ai-team adr-index".
Replace the hints in <angle brackets>, delete this comment.
-->
# ADR-NNNN · <Question: what we decide — short, like a heading>

- **Status:** active
- **Accepted:** <YYYY-MM-DD> · **Changed:** —
- **Template:** full
- **History:** [history/ADR-NNNN-<slug>.md](history/ADR-NNNN-<slug>.md)

## Why

<The context and the problem: what happened or what is missing; a live example. Two to five sentences.>

## Options

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| <an option that was discussed with the human> | <…> | <…> | no |
| **<the chosen option>** | <…> | <…> | **yes** |

<The human's corrections in the discussion, if there were any. Do not invent options — only the ones that were discussed.>

## Decision

<The first sentence is the gist of the decision in one phrase: it goes into the index. Then the details, possibly a numbered list.>

## Consequences

- <what changes: code, checks, team agreements>
- <what is postponed and where it is written down>

## Related

<IDs of other decisions (ADR-NNNN) with a note on how they are related, separated by commas.>
