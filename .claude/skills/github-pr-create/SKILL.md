---
name: github-pr-create
description: Create a GitHub pull request via gh CLI, deriving a Conventional-Commits-style title from the branch's commits and its source issue. Use when asked to create/open a PR, or to run gh pr create.
---

# GitHub PR Create

Creates a pull request via `gh pr create` for the current branch.

## Workflow

1. Read the issue tied to the branch
2. Score the branch's commits to determine type
3. Resolve scope (ask if a candidate is found)
4. Resolve milestone, assignee, base, reviewer, draft (fixed or issue-derived rules; ask if no issue is tied to the branch)
5. Resolve project (use directly if the issue has exactly one, otherwise ask)
6. Compute labels as the union of the issue's labels and deduced commit-type labels
7. Compose the body
8. Run `gh pr create` with the computed values

## Rules

* Every computed value (type, scope match, labels) comes from data actually read this session - never guessed
* Any ask uses AskUserQuestion - never a plain conversational question

## Title

Format: `type(scope): issue title (#N)` - scope segment omitted when it doesn't clear the bar.

### Type

Score every commit unique to the branch relative to the repo's default branch (`git log <default-branch>..HEAD`) by type; take the highest-ranked type present:

```
feat > fix > refactor/perf > docs > test > build/ci > chore > style
```

Every commit counts, including ones that don't follow Conventional Commits syntax - a commit without a recognized `type(scope):`/`type:` prefix is treated as the lowest tier (`style`), never excluded.

### Scope

Candidates come only from the issue's title (headline/parenthetical order) and whichever prose section the issue opens with (a `Goal` line, or the opening of `Context`/`Decisions`). `Scope`/`Work` checklists are never used. A commit is only a scope candidate if its scope token matches a name from the title or opening prose - matching is case-insensitive and ignores non-alphanumeric characters (`CommandResponse` and `command-response` match).

* **Absent** - no named candidates -> omit scope, no question
* **Single** - exactly one named candidate -> use it directly, no question
* **Multiple** - more than one named candidate -> ask the user, show what was found, use exactly what they type

### Description

The issue title, with only the first letter lowercased - rest of the title unchanged (preserves proper nouns and identifiers like `CommandResponse` or `Claude Code`). Wrap code identifiers in backticks - types/classes, functions/methods, variables/fields, file paths, and config/API keys.

## Base

Never set - omit `--base` and let `gh pr create` use its own default.

## Milestone

The issue's milestone, if it has one. Left unset otherwise.

No issue tied to the branch -> fetch the repo's open milestones (`gh api repos/{owner}/{repo}/milestones`) and ask the user, offering the titles as quick picks plus a "skip" option.

## Assignee

Always the command invoker - `gh`'s `@me` alias (the currently authenticated user), never a fixed name.

## Reviewer

Never set.

## Draft

Never set.

## Project

Check the issue's own project membership (`projectItems`). Exactly one -> use it directly. Zero, or more than one -> ask the user (offer any found candidates as quick picks; free text for anything else).

No issue tied to the branch -> fetch the repo's projects (`gh project list --owner <owner>`) and ask the user, offering the titles as quick picks plus a "skip" option.

## Labels

Union of:

* The issue's own labels
* Labels deduced from the commit types present on the branch, mapped as:
  * `feat` -> `enhancement`
  * `fix` -> `bug`
  * `docs` -> `documentation`
  * `test` -> `Testing`
  * `build` -> `dependencies`

A commit type with no mapped label (`refactor`, `perf`, `ci`, `chore`, `style`) doesn't add one.

## Body

Template:

```
## Summary

* <bullet: specific change>
* <bullet: specific change>

Closes #<N>

## Commits

* <commit 1 subject>
* <commit 2 subject>

## Verification Steps

- [ ] <verification step>
```

`## Commits` lists the branch's commit subjects verbatim (GitHub's own default multi-commit format) - the full per-commit body detail already survives in the squash commit on `main`, so it isn't duplicated here.

`## Verification Steps` calls out `npm run lint` and `npm test` specifically when the branch includes a code change (any commit type other than `docs`, `chore`, or `style`), plus additional verification steps specific to the work actually done on the branch.

No footer line - nothing is appended to attribute PR authorship to a tool.
