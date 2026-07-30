---
name: create-work-checklist
description: Create a per-file implementation outline for a GitHub issue at .claude/tmp/issue-<number>/outline.md. Use when asked to plan, scope, or break down an issue before implementation.
---

# Create Work Checklist

Produces `.claude/tmp/issue-<number>/outline.md` - a file-by-file implementation plan for a GitHub issue, written after reading both the issue and the current state of the affected code. `.claude/tmp/` is a local, gitignored scratch space, not team-shared.

## Issue ID

* **Condition 1** - user provides the issue ID (argument or conversation): use it directly
* **Condition 2** - user doesn't provide it, current branch isn't the default branch: extract the issue number from the branch name, ask the user to confirm via AskUserQuestion (branch-derived ID or Cancel; free text always available for a different number)
* **Condition 3** - user doesn't provide it, current branch is the default branch: nothing to derive - ask via AskUserQuestion, offering the top 4 results of `gh issue list --state open --search "sort:updated-desc" --limit 5` as quick picks (free-text always available for anything else)

Selecting Cancel stops the workflow - no outline is written.

Every ask in this section uses AskUserQuestion - never a plain conversational question. A plain response doesn't reliably signal that the workflow is blocked waiting on required input.

## Errors

* Issue not found (404) - report it, stop. No retry, no guessing at a different number.
* Any other failure (API error including 5xx/protocol-level responses, tool permission, CLI permission, network) - report it to the user, stop, let them decide how to proceed

## Workflow

1. Get the issue ID, if not provided
2. Read the issue
3. Identify affected files - from the issue's own text and by exploring the codebase directly
4. Read those files to confirm current state
5. If something the issue doesn't resolve turns up, ask before writing
6. Write `outline.md` following the Structure below

## Structure

```
# Issue #<N> outline - <short description>

<Depends on / Blocks: #M (...)>

## Decisions locked

* <settled scoping decision, with rationale>

## 1. <file path>

* <specific change: function/method, signature, behavior>

<optional: state table, only when this specific file's logic warrants one>

## 2. <file path>

...

## <N>. Tests

* <spec file>: <test case>, <test case>, ...

## <N>. docs/<file>

* <specific doc update>
```

## Sections

* **Title** - always present: `# Issue #<N> outline - <short description>`
* **Relationship line** - only when the issue depends on or blocks another issue; sourced from the issue's own title/label
* **Decisions locked** - only when this issue has open scoping decisions to work through with the user before execution; not retained once resolved
* **Numbered file sections** - one per affected file, ordered by dependency layer (foundational/lowest-level file first, working up toward the user-facing surface); no line numbers; a state table only when that file's logic warrants one
* **Tests section** - always present, listing affected spec files and terse test-case names
* **Docs section** - present when documentation needs updating

## Rules

* Every file-level claim (function names, signatures, behavior) comes from a file actually read this session - never guessed
* Numbered sections contain only actionable work - no narration of what's excluded or unchanged
* Writing `outline.md` is destructive - a pre-existing file at that path is never read; the new file is composed fresh from the issue and code, not the old version
