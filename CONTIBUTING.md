# Contributing to FlowDesk

## Branch Naming

| Type | Pattern | When to use |
|---|---|---|
| `feature/` | `feature/short-description` | New functionality |
| `fix/` | `fix/short-description` | Bug fixes |
| `refactor/` | `refactor/short-description` | Code cleanup, no behavior change |
| `chore/` | `chore/short-description` | Config, deps, tooling |
| `hotfix/` | `hotfix/short-description` | Urgent production fix |

**Rules:**
- Always lowercase, use `-` not `_` or spaces
- Keep it short and descriptive
- One concern per branch
- Always branch off `main`

**Examples:**
```
feature/task-filters
fix/signup-role-null
refactor/drizzle-orm-migration
chore/contributing-guide
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add task priority filter
fix: resolve null role_id on signup
refactor: migrate raw queries to drizzle orm
chore: add contributing guide
```

## Workflow
```bash
# 1. Start from latest main
git checkout main
git pull

# 2. Create your branch
git checkout -b feature/your-feature

# 3. Make changes, then commit
git add .
git commit -m "feat: your message here"

# 4. Push and open a PR to main
git push origin feature/your-feature
```

## PR Rules
- Every change goes through a PR — no direct pushes to `main`
- Keep PRs small and focused on one thing
- Link related issues in the PR description if any
