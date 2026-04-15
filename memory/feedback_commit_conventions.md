---
name: Commit message conventions
description: Rules for git commits in the Silkspot repo — format, types, approval flow
type: feedback
---

Always follow this convention for every commit in this repo.

**Format:** `<type>(<scope>): <short summary>`

**Types:**
- `fix(...)` — bug fixes
- `feat(...)` — new behaviour
- `refactor(...)` — no behaviour change
- `docs(...)` — documentation only
- `chore(...)` — tooling / housekeeping

**Rules:**
- Never use short/empty messages like "x", "fix", "update".
- If changes span multiple types, split into 2-3 logical commits.

**Approval flow:**
- Commit automatically after each task — no need to wait for "ok".
- Never push (`git push`).

**After commit:** show hash + `git status` (must be clean).

**Why:** User explicitly set these rules to keep history readable and reviewable.
**How to apply:** Every time a commit is about to be created, follow the approval flow above — no exceptions.
