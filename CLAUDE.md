# Project context

Full-stack app: Go backend, React frontend.
Monorepo root. Backend in /backend, frontend in /frontend.

## Stack

| Layer    | Tech                                               |
| -------- | -------------------------------------------------- |
| Backend  | Go 1.26.1, Gin, GORM (PostgreSQL), Wire            |
| Frontend | React, TypeScript, Vite, shadcn/ui, Tailwind v4    |
| Auth     | JWT — tokens in HttpOnly cookies                   |
| DB       | PostgreSQL 18, migrations via golang-migrate       |

## Skills

- `frontend` — load when writing any React / UI / Tailwind code
- `backend` — load when writing any Go code
- `shared` — load for naming, git, testing, cross-cutting work

When in doubt, load `shared` + the relevant domain skill.

## Hard rules

- Never add a dependency without asking first.
- Every new file needs a corresponding test file.
- Commits: feat / fix / chore / refactor / test / docs (conventional commits).
- No placeholder or TODO code — ask if unsure.
- No console.log, hardcoded secrets, or magic numbers in committed code.

## Do not touch (generated)

- /backend/cmd/wire_gen.go → regenerate: wire gen ./cmd/
- /frontend/src/components/ui/ → add components: npx shadcn@latest add <n>
