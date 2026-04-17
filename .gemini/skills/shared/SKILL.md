---
name: shared
description: >
    Cross-cutting conventions for this project. Use for naming, git commits,
    error handling, code hygiene, and environment config. Applies to both
    frontend and backend. Load alongside the domain skill.
---

# Shared conventions

## Naming

| Context        | Convention        | Example                                |
| -------------- | ----------------- | -------------------------------------- |
| Go types       | PascalCase        | UserRepository, OrderID                |
| Go vars/funcs  | camelCase         | createUser, userID, parseDate          |
| Go files       | snake_case        | user_repository.go                     |
| Go packages    | lowercase         | user, order, persistence               |
| TS components  | PascalCase        | UserCard, OrderTable                   |
| TS functions   | camelCase         | createUser, formatDate                 |
| TS files       | kebab-case        | user-card.tsx, format-date.ts          |
| Test files     | same + suffix     | user_repo_test.go / user-card.test.tsx |
| DB columns     | snake_case        | created_at, user_id                    |
| DB tables      | snake_case plural | users, order_items                     |
| Env vars       | SCREAMING         | DATABASE_URL, JWT_SECRET               |
| Constants (Go) | PascalCase        | MaxRetryAttempts                       |
| Constants (TS) | SCREAMING         | MAX_FILE_SIZE                          |

---

## Git commits — conventional commits

```
feat:      new user-facing feature
fix:       bug fix
refactor:  code change with no behaviour change
chore:     deps, config, tooling, CI
test:      add or fix tests only
docs:      documentation only
perf:      performance improvement
ci:        CI/CD pipeline changes
```

Format: type(scope): short description in imperative mood
Example: feat(auth): add JWT refresh token rotation
fix(order): correct total calculation when discount applied (#42)

Rules:

- Subject line max 72 characters.
- Imperative mood: "add X" not "added X" or "adds X".
- Reference issues when relevant: (#42).
- Never commit directly to main. Always branch + PR.

---

## Error handling

### Go

- Never swallow errors. Always return or log with context.
- Wrap with fmt.Errorf("context: %w", err) to preserve the chain.
- Use errors.Is() for sentinel comparison, errors.As() for type assertion.
- Define sentinel errors in domain/<feature>/errors.go.
- Never expose raw DB or framework errors in HTTP responses.
- Log at infrastructure boundaries. Do not log the same error twice.

### TypeScript

- Never use floating .catch() — always handle or propagate.
- Use React Query isError / error — no try/catch in component bodies.
- Type catch variables: catch (err: unknown) then narrow.
- Never use console.error as a substitute for real error handling.

---

## Code hygiene

- No console.log left in committed code.
- No hardcoded secrets, API keys, connection strings, or credentials.
- No magic numbers — define as named constants.
- No commented-out code committed to main.
- No TODO / FIXME without a linked issue number: // TODO(#42): remove after migration.
- No any in TypeScript without an eslint-disable comment + reason.
- No interface{} in Go without a comment explaining why.
- No unused imports.

---

## Environment variables

### Rules

- Every env var documented in .env.example with a comment.
- Backend reads config via a typed Config struct — no os.Getenv scattered.
- Frontend: VITE\_ prefix for client-side vars. Never expose secrets client-side.
- Never commit .env files. Only commit .env.example.

### Backend config pattern

```go
// internal/config/config.go
type Config struct {
    Addr        string `env:"ADDR"         envDefault:":8080"`
    DatabaseURL string `env:"DATABASE_URL"  required:"true"`
    JWTSecret   string `env:"JWT_SECRET"    required:"true"`
    Environment string `env:"ENVIRONMENT"   envDefault:"development"`
}

func Load() (*Config, error) {
    var cfg Config
    if err := env.Parse(&cfg); err != nil {
        return nil, fmt.Errorf("parse config: %w", err)
    }
    return &cfg, nil
}
```

Use github.com/caarlos0/env/v11 for parsing.

---

## File size limits

| File type         | Soft limit | Action when exceeded           |
| ----------------- | ---------- | ------------------------------ |
| Go file           | 300 lines  | Split by responsibility        |
| Go function       | 40 lines   | Extract helper                 |
| TS component      | 150 lines  | Split into sub-components      |
| TS hook           | 80 lines   | Split or extract utility       |
| TS page component | 100 lines  | Delegate to feature components |

---

## Do not

- No commits directly to main.
- No skipped tests without a dated comment and issue reference.
- No PR without passing CI.
- No dependency added without discussion.
- No secrets in code, comments, or commit messages.
