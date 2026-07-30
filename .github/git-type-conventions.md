# Type Conventions

Commit messages and branch names share one type vocabulary (Conventional Commits).

| Type | Use for |
|---|---|
| `feat` | New functionality for the shipped product |
| `fix` | Bug fixes |
| `refactor` | Internal restructuring, no behavior change |
| `perf` | Performance improvements |
| `docs` | Documentation-only changes |
| `test` | Test-only changes |
| `build` | Build system, dependencies, packaging |
| `ci` | CI/CD pipeline changes |
| `chore` | Tooling, maintenance, process - no product or build impact |
| `style` | Formatting/whitespace only, no logic change |

## Commits

`type(scope): description` - scope is the affected area (e.g. `manage-command`, `command-response`).

## Branches

`type/<issue-id>-slug`
