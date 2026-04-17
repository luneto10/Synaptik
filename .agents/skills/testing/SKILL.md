---
name: testing
description: >
    Use when writing tests for Go or TypeScript code. Covers unit tests,
    integration tests, table-driven tests, mocks, React Testing Library,
    and test file structure. Load alongside the backend or frontend skill.
---

# Testing conventions

## Go — backend

### Rules

- Every exported function gets at least one test.
- Table-driven tests for all functions with multiple input cases.
- Test file lives next to the file it tests: user_repo_test.go beside user_repo.go.
- Package: use the \_test suffix for black-box tests (preferred).
  Use the same package for white-box tests (access to unexported fields).
- Use testify/assert for non-fatal assertions, testify/require for fatal ones.
- Mock only at boundaries (Repository interface, HTTP client). Never mock domain logic.
- Use real DB with a test schema for repository integration tests.

### Table-driven test structure

```go
// internal/application/user/use_case_test.go
package userapp_test

import (
    "context"
    "errors"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"

    userapp "yourapp/internal/application/user"
    "yourapp/internal/domain/user"
)

func TestCreateUserUseCase_Execute(t *testing.T) {
    tests := []struct {
        name      string
        req       userapp.CreateUserRequest
        setupMock func(*mockUserRepository)
        wantErr   error
        wantEmail string
    }{
        {
            name: "creates user successfully",
            req:  userapp.CreateUserRequest{Email: "jane@example.com", Name: "Jane"},
            setupMock: func(m *mockUserRepository) {
                m.existsByEmailFn = func(_ context.Context, _ user.Email) (bool, error) {
                    return false, nil
                }
                m.saveFn = func(_ context.Context, _ *user.User) error {
                    return nil
                }
            },
            wantEmail: "jane@example.com",
        },
        {
            name: "returns error when email already exists",
            req:  userapp.CreateUserRequest{Email: "dup@example.com", Name: "Dup"},
            setupMock: func(m *mockUserRepository) {
                m.existsByEmailFn = func(_ context.Context, _ user.Email) (bool, error) {
                    return true, nil
                }
            },
            wantErr: user.ErrEmailExists,
        },
        {
            name: "returns error on invalid email",
            req:  userapp.CreateUserRequest{Email: "not-an-email", Name: "Bad"},
            setupMock: func(m *mockUserRepository) {},
            wantErr:   errors.New("invalid email"),
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            repo := &mockUserRepository{}
            tt.setupMock(repo)

            uc := userapp.NewCreateUserUseCase(repo)
            resp, err := uc.Execute(context.Background(), tt.req)

            if tt.wantErr != nil {
                require.Error(t, err)
                assert.ErrorContains(t, err, tt.wantErr.Error())
                return
            }

            require.NoError(t, err)
            assert.Equal(t, tt.wantEmail, resp.Email)
            assert.NotEmpty(t, resp.ID)
        })
    }
}
```

### Manual mock (preferred over gomock for simple cases)

```go
// internal/application/user/mock_test.go
package userapp_test

import (
    "context"
    "yourapp/internal/domain/user"
)

type mockUserRepository struct {
    saveFn           func(ctx context.Context, u *user.User) error
    findByIDFn       func(ctx context.Context, id user.UserID) (*user.User, error)
    findByEmailFn    func(ctx context.Context, email user.Email) (*user.User, error)
    existsByEmailFn  func(ctx context.Context, email user.Email) (bool, error)
    listFn           func(ctx context.Context, limit, offset int) ([]*user.User, error)
}

func (m *mockUserRepository) Save(ctx context.Context, u *user.User) error {
    if m.saveFn != nil {
        return m.saveFn(ctx, u)
    }
    return nil
}
func (m *mockUserRepository) FindByID(ctx context.Context, id user.UserID) (*user.User, error) {
    if m.findByIDFn != nil {
        return m.findByIDFn(ctx, id)
    }
    return nil, user.ErrNotFound
}
func (m *mockUserRepository) FindByEmail(ctx context.Context, email user.Email) (*user.User, error) {
    if m.findByEmailFn != nil {
        return m.findByEmailFn(ctx, email)
    }
    return nil, user.ErrNotFound
}
func (m *mockUserRepository) ExistsByEmail(ctx context.Context, email user.Email) (bool, error) {
    if m.existsByEmailFn != nil {
        return m.existsByEmailFn(ctx, email)
    }
    return false, nil
}
func (m *mockUserRepository) List(ctx context.Context, limit, offset int) ([]*user.User, error) {
    if m.listFn != nil {
        return m.listFn(ctx, limit, offset)
    }
    return nil, nil
}
```

### Repository integration test (real DB)

```go
// internal/infrastructure/persistence/gorm/repository/user_repo_integration_test.go
//go:build integration

package repository_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"

    "yourapp/internal/domain/user"
    "yourapp/internal/infrastructure/persistence/gorm/repository"
)

func setupTestDB(t *testing.T) *gorm.DB {
    t.Helper()
    dsn := "host=localhost user=test password=test dbname=test_db port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    require.NoError(t, err)

    // Clean state before each test
    t.Cleanup(func() {
        db.Exec("TRUNCATE TABLE users CASCADE")
    })
    return db
}

func TestGormUserRepository_Save_FindByID(t *testing.T) {
    db := setupTestDB(t)
    repo := repository.NewGormUserRepository(db)

    email, _ := user.NewEmail("test@example.com")
    u, err := user.NewUser(user.UserID("test-id"), email, "Test User")
    require.NoError(t, err)

    err = repo.Save(context.Background(), u)
    require.NoError(t, err)

    found, err := repo.FindByID(context.Background(), u.ID())
    require.NoError(t, err)
    assert.Equal(t, u.ID(), found.ID())
    assert.Equal(t, u.Email(), found.Email())
}
```

Run integration tests separately:
go test -tags=integration ./...

### Domain entity tests

```go
// internal/domain/user/entity_test.go
package user_test

func TestNewUser(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        wantErr bool
    }{
        {"valid name", "Jane Smith", false},
        {"empty name", "", true},
        {"whitespace only", "   ", true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            email, _ := NewEmail("test@example.com")
            _, err := NewUser(UserID("id"), email, tt.input)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

---

## TypeScript — frontend

### Rules

- Every component and hook gets at least one test.
- Test file lives next to the file it tests: UserCard.test.tsx beside UserCard.tsx.
- Use React Testing Library — no Enzyme, no shallow rendering.
- Query by accessible role/label/text, not by CSS class or test ID.
  Order of preference: getByRole > getByLabelText > getByText > getByTestId.
- Use data-testid only as a last resort.
- Mock at the network layer (msw) — never mock React Query or internal hooks.
- Use vitest (not Jest) if using Vite.

### Component test structure

```tsx
// src/components/features/UserCard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UserCard } from "./UserCard";

describe("UserCard", () => {
    it("renders name and email", () => {
        render(
            <UserCard
                name="Jane Smith"
                email="jane@example.com"
                role="admin"
            />,
        );
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
        expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("shows admin badge for admin role", () => {
        render(<UserCard name="Jane" email="jane@example.com" role="admin" />);
        expect(screen.getByText("admin")).toBeInTheDocument();
    });

    it("shows secondary badge for non-admin roles", () => {
        render(<UserCard name="Jane" email="jane@example.com" role="member" />);
        const badge = screen.getByText("member");
        expect(badge).toBeInTheDocument();
    });
});
```

### Form test with user interaction

```tsx
// src/components/features/CreateUserForm.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CreateUserForm } from "./CreateUserForm";

describe("CreateUserForm", () => {
    it("calls onSubmit with valid data", async () => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<CreateUserForm onSubmit={onSubmit} />);

        await userEvent.type(screen.getByLabelText("Name"), "Jane Smith");
        await userEvent.type(
            screen.getByLabelText("Email"),
            "jane@example.com",
        );
        await userEvent.click(
            screen.getByRole("button", { name: /create user/i }),
        );

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith({
                name: "Jane Smith",
                email: "jane@example.com",
            });
        });
    });

    it("shows validation error for invalid email", async () => {
        render(<CreateUserForm onSubmit={vi.fn()} />);

        await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
        await userEvent.click(
            screen.getByRole("button", { name: /create user/i }),
        );

        expect(
            await screen.findByText("Invalid email address"),
        ).toBeInTheDocument();
    });
});
```

### API mock with msw

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
    http.get("/api/v1/users", () => {
        return HttpResponse.json({
            users: [
                {
                    id: "1",
                    name: "Jane Smith",
                    email: "jane@example.com",
                    role: "admin",
                },
            ],
            total: 1,
            page: 1,
            limit: 20,
        });
    }),

    http.post("/api/v1/users", async ({ request }) => {
        const body = (await request.json()) as { name: string; email: string };
        return HttpResponse.json(
            {
                id: "new-id",
                ...body,
                role: "member",
                created_at: new Date().toISOString(),
            },
            { status: 201 },
        );
    }),

    http.post("/api/v1/users", () => {
        return HttpResponse.json(
            { error: "email already registered" },
            { status: 409 },
        );
    }),
];
```

```ts
// src/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```ts
// src/test/setup.ts
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "../mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Hook test with React Query

```tsx
// src/hooks/useUsers.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import { useUsers } from "./useUsers";

function wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useUsers", () => {
    it("returns users from the API", async () => {
        const { result } = renderHook(() => useUsers(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.users).toHaveLength(1);
        expect(result.current.data?.users[0].name).toBe("Jane Smith");
    });
});
```

---

## Test coverage targets

| Layer                 | Target |
| --------------------- | ------ |
| Domain entities       | 100%   |
| Application use cases | 100%   |
| Infrastructure repos  | 80%+   |
| Gin handlers          | 70%+   |
| React components      | 70%+   |
| React hooks           | 80%+   |

Run coverage:
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

vitest run --coverage

---

## Do not

- No shallow rendering (Enzyme).
- No mocking React Query internals.
- No CSS class selectors in queries.
- No testing implementation details — test behaviour.
- No skipped tests without a dated comment and issue reference.
- No gomock-generated mocks for simple cases — use manual mocks.
