## 1. Docs (#141)

- [ ] 1.1 [light] `ai-team-docs/atd/README.md:5`: replace the path `templates/decisions/` with `modules/decisions/templates/decisions/` (keep the backticks and the rest of the sentence: "… AI kit (полный — если в разговоре были варианты, иначе минимум)"). Change nothing else in the file. Verify: `git grep -n "modules/decisions/templates/decisions/" -- ai-team-docs/atd/README.md` lists line 5; `git grep -nE "(^|[^/])templates/decisions/" -- ai-team-docs/atd/README.md` is empty; `ai-team check` green; `npm run check` green.
