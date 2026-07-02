---
name: gitkraken-commit-msg
description: Generate a commit message to be used in GitKraken. Will have a title of 72 characters and a body if more is needed
---

<!-- Tip: Use /create-skill in chat to generate content with agent assistance -->

* Git Kraken has two components to a commit message:
   * Title:
      * (Require)
      * Format: `<type>[(<scope>)][!]: <description>`
      * Soft Max Length 50
      * Hard Max length 72
      * `<type>`: one of `feat`, `fix`, `refactor`, `perf`, `style`, `test`,
        `docs`, `build`, `ops`, `chore`
      * `<scope>` (optional): project-specific noun in parens - never an
        issue identifier
      * Breaking change: `!` immediately before the colon
      * `<description>`: imperative present tense, no capitalized first
        letter, no trailing period
   * Body:
      * (Optional)
      * Bullet points are '*' not '-'
      * Explains motivation/contrast with prior behavior, imperative tense
      * Footer-style trailers (issue refs, `BREAKING CHANGE:`,
        co-authorship) go at the end, separated by a blank line
* References:
   * https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13
   * https://www.conventionalcommits.org/en/v1.0.0/
* Validate that we are not on the 'main' branch
* Read git diff --staged, git diff (unstaged), and git status (untracked
  files) to build a full picture of all pending changes
* Identify/callout relevancy issues across the full picture - e.g. staged
  changes that mix unrelated concerns, or unstaged/untracked changes that
  look related to what's staged and may have been left out by mistake
* Draft and Present feedback about files to be staged and those unstaged
    * Optional - do not present if there are no issues
    * Markdown format
    * Ability for user to copy
* Draft and Present the commit message from what's staged
    * Markdown format
    * Ability for user to copy
    * Unstaged/Untracked findings are feedback
    * Imperative mood/tone
    * Always append a co-authorship trailer, formatted per Claude Code's
      standard convention