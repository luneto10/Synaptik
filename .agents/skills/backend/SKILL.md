---
name: backend
description: >
    Use when writing Go code: handlers, use cases, domain entities, repositories,
    DTOs, mappers, Wire DI wiring, or any file under /backend. Enforces Onion
    Architecture with DDD, Gin for HTTP, GORM for persistence, Wire per-layer DI.
---

# Go backend — Onion Architecture + DDD

## Dependency rule (non-negotiable)

infrastructure -> application -> domain

- domain/ zero framework imports. Pure Go. Knows nothing outside itself.
- application/ imports domain only. No GORM, Gin, or DB drivers.
- infrastructure/ imports application and domain. Owns all framework code.

To invert a dependency: define an interface in domain, implement it in infra.

---

## Full folder structure

```
backend/
  cmd/
    main.go                          <- server bootstrap, calls InitializeApp
    wire.go                          <- wire.Build (build tag: wireinject)
    wire_gen.go                      <- Wire generated — DO NOT EDIT

  config/
    config.go                        <- typed Config struct, Load() via env

  internal/
    domain/
      user/
        entity.go                    <- User struct, NewUser(), Reconstruct()
        value_objects.go             <- Email, Password, Money, etc.
        repository.go                <- UserRepository interface
        events.go                    <- UserCreated, UserUpdated events
        errors.go                    <- ErrNotFound, ErrEmailExists, etc.
        provider.go                  <- domain.ProviderSet
      order/
        entity.go
        repository.go
        errors.go
        provider.go

    application/
      user/
        dto.go                       <- CreateUserRequest, UserResponse, etc.
        mapper.go                    <- entity -> DTO (ToResponse, ToResponseList)
        create_user.go               <- CreateUserUseCase struct + Execute()
        get_user.go                  <- GetUserUseCase
        list_users.go                <- ListUsersUseCase
        update_user.go               <- UpdateUserUseCase
        delete_user.go               <- DeleteUserUseCase
      order/
        dto.go
        mapper.go
        create_order.go
      provider.go                    <- application.ProviderSet

    infrastructure/
      persistence/
        postgres/
          model/
            user_model.go            <- UserModel GORM struct + TableName()
            order_model.go
          repository/
            user_repository.go       <- GormUserRepository implements domain.UserRepository
            user_repository_mapper.go <- UserModel <-> User entity conversion
            order_repository.go
            order_repository_mapper.go
          migrations/
            000001_create_users.up.sql
            000001_create_users.down.sql
            000002_create_orders.up.sql
            000002_create_orders.down.sql
        db.go                        <- NewDB() *gorm.DB, connection pool config
        migrator.go                  <- RunMigrations() using golang-migrate

      http/
        gin/
          handler/
            user_handler.go          <- Gin handlers, thin, no logic
            auth_handler.go
          router/
            router.go                <- route registration
          middleware/
            auth.go                  <- JWT validation middleware
            logger.go
            recovery.go
          response/
            response.go              <- BaseApiResponse[T] + helpers

      provider.go                    <- infrastructure.ProviderSet (assembles all)

  test/
    integration/
      user_repository_test.go        <- real DB integration tests
      order_repository_test.go
    testutil/
      db.go                          <- SetupTestDB(), CleanupDB()
      fixtures.go                    <- seed helpers (NewTestUser, etc.)

  .env.example
  go.mod
  go.sum
  Makefile
```

---

## DI — each layer owns its ProviderSet

```go
// internal/domain/user/provider.go
package user

import "github.com/google/wire"

var ProviderSet = wire.NewSet() // wire.Bind added in infrastructure/provider.go

// internal/application/provider.go
package application

import (
    "github.com/google/wire"
    userapp "yourapp/internal/application/user"
    orderapp "yourapp/internal/application/order"
)

var ProviderSet = wire.NewSet(
    userapp.NewCreateUserUseCase,
    userapp.NewGetUserUseCase,
    userapp.NewListUsersUseCase,
    userapp.NewUpdateUserUseCase,
    userapp.NewDeleteUserUseCase,
    orderapp.NewCreateOrderUseCase,
)

// internal/infrastructure/provider.go
package infrastructure

import (
    "github.com/google/wire"
    "yourapp/internal/application"
    domainuser "yourapp/internal/domain/user"
    "yourapp/internal/infrastructure/http/gin/handler"
    "yourapp/internal/infrastructure/http/gin/router"
    "yourapp/internal/infrastructure/persistence"
    "yourapp/internal/infrastructure/persistence/postgres/repository"
)

var ProviderSet = wire.NewSet(
    application.ProviderSet,

    // DB
    persistence.NewDB,

    // user
    repository.NewGormUserRepository,
    wire.Bind(new(domainuser.Repository), new(*repository.GormUserRepository)),

    // handlers + router
    handler.NewUserHandler,
    handler.NewAuthHandler,
    router.New,
)

// cmd/wire.go  (build tag: wireinject)
//go:build wireinject

package main

import (
    "github.com/google/wire"
    "yourapp/config"
    "yourapp/internal/infrastructure"
    "yourapp/internal/infrastructure/http/gin/router"
)

func InitializeApp(cfg *config.Config) (*router.Router, error) {
    wire.Build(infrastructure.ProviderSet)
    return nil, nil
}
```

Run `wire gen ./cmd/` after any provider change.

---

## Domain layer

### Entity — internal/domain/user/entity.go

```go
package user

import (
    "errors"
    "strings"
    "time"
)

type UserID string

type User struct {
    id        UserID
    email     Email
    name      string
    role      Role
    createdAt time.Time
    updatedAt time.Time
}

// NewUser validates invariants and creates a new User.
// Use only for first-time creation — never for hydrating from storage.
func NewUser(id UserID, email Email, name string, role Role) (*User, error) {
    if strings.TrimSpace(name) == "" {
        return nil, errors.New("name cannot be empty")
    }
    now := time.Now().UTC()
    return &User{
        id: id, email: email, name: name,
        role: role, createdAt: now, updatedAt: now,
    }, nil
}

// Reconstruct hydrates a User from persistence.
// Skips creation-only invariant checks.
func Reconstruct(id UserID, email Email, name string, role Role, createdAt, updatedAt time.Time) *User {
    return &User{id: id, email: email, name: name, role: role,
        createdAt: createdAt, updatedAt: updatedAt}
}

func (u *User) ID() UserID           { return u.id }
func (u *User) Email() Email         { return u.email }
func (u *User) Name() string         { return u.name }
func (u *User) Role() Role           { return u.role }
func (u *User) CreatedAt() time.Time { return u.createdAt }
func (u *User) UpdatedAt() time.Time { return u.updatedAt }

func (u *User) ChangeName(name string) error {
    if strings.TrimSpace(name) == "" {
        return errors.New("name cannot be empty")
    }
    u.name = name
    u.updatedAt = time.Now().UTC()
    return nil
}
```

### Value objects — internal/domain/user/value_objects.go

```go
package user

import (
    "errors"
    "strings"
)

// Email
type Email struct{ value string }

func NewEmail(raw string) (Email, error) {
    v := strings.TrimSpace(strings.ToLower(raw))
    if !strings.Contains(v, "@") || len(v) < 3 {
        return Email{}, errors.New("invalid email address")
    }
    return Email{value: v}, nil
}

func (e Email) String() string      { return e.value }
func (e Email) Equals(o Email) bool { return e.value == o.value }

// Role
type Role string

const (
    RoleAdmin  Role = "admin"
    RoleMember Role = "member"
    RoleViewer Role = "viewer"
)

func NewRole(raw string) (Role, error) {
    switch Role(raw) {
    case RoleAdmin, RoleMember, RoleViewer:
        return Role(raw), nil
    }
    return "", errors.New("invalid role: " + raw)
}
```

### Repository interface — internal/domain/user/repository.go

```go
package user

import "context"

// Repository is the domain contract for user persistence.
// Defined here. Implemented in infrastructure/persistence/postgres/repository/.
// Domain never imports infrastructure.
type Repository interface {
    Save(ctx context.Context, u *User) error
    FindByID(ctx context.Context, id UserID) (*User, error)
    FindByEmail(ctx context.Context, email Email) (*User, error)
    ExistsByEmail(ctx context.Context, email Email) (bool, error)
    List(ctx context.Context, limit, offset int) ([]*User, int64, error)
    Delete(ctx context.Context, id UserID) error
}
```

### Domain errors — internal/domain/user/errors.go

```go
package user

import "errors"

var (
    ErrNotFound     = errors.New("user not found")
    ErrEmailExists  = errors.New("email already registered")
    ErrUnauthorized = errors.New("unauthorized")
    ErrInvalidRole  = errors.New("invalid role")
)
```

---

## Application layer

### DTOs — internal/application/user/dto.go

```go
package userapp

// Request DTOs: json + binding tags only. Never gorm: or db:.
type CreateUserRequest struct {
    Email string `json:"email" binding:"required,email"`
    Name  string `json:"name"  binding:"required,min=2,max=100"`
    Role  string `json:"role"  binding:"required,oneof=admin member viewer"`
}

type UpdateUserRequest struct {
    Name string `json:"name" binding:"omitempty,min=2,max=100"`
    Role string `json:"role" binding:"omitempty,oneof=admin member viewer"`
}

type ListUsersRequest struct {
    Page  int    `form:"page"  binding:"omitempty,min=1"`
    Limit int    `form:"limit" binding:"omitempty,min=1,max=100"`
    Role  string `form:"role"  binding:"omitempty,oneof=admin member viewer"`
}

// Response DTOs: expose only what the caller needs.
type UserResponse struct {
    ID        string `json:"id"`
    Email     string `json:"email"`
    Name      string `json:"name"`
    Role      string `json:"role"`
    CreatedAt string `json:"created_at"`
}

type ListUsersResponse struct {
    Users  []UserResponse `json:"users"`
    Total  int64          `json:"total"`
    Page   int            `json:"page"`
    Limit  int            `json:"limit"`
}
```

### Mapper — internal/application/user/mapper.go

```go
package userapp

import (
    "time"
    "yourapp/internal/domain/user"
)

func ToResponse(u *user.User) UserResponse {
    return UserResponse{
        ID:        string(u.ID()),
        Email:     u.Email().String(),
        Name:      u.Name(),
        Role:      string(u.Role()),
        CreatedAt: u.CreatedAt().Format(time.RFC3339),
    }
}

func ToResponseList(users []*user.User, total int64, page, limit int) ListUsersResponse {
    items := make([]UserResponse, len(users))
    for i, u := range users {
        items[i] = ToResponse(u)
    }
    return ListUsersResponse{Users: items, Total: total, Page: page, Limit: limit}
}
```

### Use case — internal/application/user/create_user.go

```go
package userapp

import (
    "context"
    "fmt"
    "yourapp/internal/domain/user"
    "github.com/google/uuid"
)

type CreateUserUseCase struct {
    repo user.Repository
}

func NewCreateUserUseCase(repo user.Repository) *CreateUserUseCase {
    return &CreateUserUseCase{repo: repo}
}

func (uc *CreateUserUseCase) Execute(ctx context.Context, req CreateUserRequest) (UserResponse, error) {
    email, err := user.NewEmail(req.Email)
    if err != nil {
        return UserResponse{}, err
    }
    role, err := user.NewRole(req.Role)
    if err != nil {
        return UserResponse{}, err
    }
    exists, err := uc.repo.ExistsByEmail(ctx, email)
    if err != nil {
        return UserResponse{}, fmt.Errorf("check email: %w", err)
    }
    if exists {
        return UserResponse{}, user.ErrEmailExists
    }
    u, err := user.NewUser(user.UserID(uuid.NewString()), email, req.Name, role)
    if err != nil {
        return UserResponse{}, err
    }
    if err := uc.repo.Save(ctx, u); err != nil {
        return UserResponse{}, fmt.Errorf("save user: %w", err)
    }
    return ToResponse(u), nil
}
```

---

## Infrastructure layer

### GORM model — internal/infrastructure/persistence/postgres/model/user_model.go

```go
package model

import (
    "time"
    "gorm.io/gorm"
)

// UserModel is the GORM persistence struct.
// It is an infrastructure concern — never imported by domain or application.
type UserModel struct {
    ID        string         `gorm:"primaryKey;type:varchar(36)"`
    Email     string         `gorm:"uniqueIndex;not null"`
    Name      string         `gorm:"not null"`
    Role      string         `gorm:"not null;default:'member'"`
    CreatedAt time.Time      `gorm:"autoCreateTime"`
    UpdatedAt time.Time      `gorm:"autoUpdateTime"`
    DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (UserModel) TableName() string { return "users" }
```

### Repository mapper — internal/infrastructure/persistence/postgres/repository/user_repository_mapper.go

```go
package repository

import (
    domainuser "yourapp/internal/domain/user"
    "yourapp/internal/infrastructure/persistence/postgres/model"
)

// toDomain converts a GORM persistence model to a domain entity.
// Uses Reconstruct() — bypasses creation-only invariant checks.
func toDomain(m *model.UserModel) (*domainuser.User, error) {
    email, err := domainuser.NewEmail(m.Email)
    if err != nil {
        return nil, err
    }
    role, err := domainuser.NewRole(m.Role)
    if err != nil {
        return nil, err
    }
    return domainuser.Reconstruct(
        domainuser.UserID(m.ID), email, m.Name, role, m.CreatedAt, m.UpdatedAt,
    ), nil
}

// toModel converts a domain entity to a GORM persistence model.
func toModel(u *domainuser.User) *model.UserModel {
    return &model.UserModel{
        ID:    string(u.ID()),
        Email: u.Email().String(),
        Name:  u.Name(),
        Role:  string(u.Role()),
    }
}
```

### Repository implementation — internal/infrastructure/persistence/postgres/repository/user_repository.go

```go
package repository

import (
    "context"
    "errors"
    "fmt"

    "gorm.io/gorm"

    domainuser "yourapp/internal/domain/user"
    "yourapp/internal/infrastructure/persistence/postgres/model"
)

// GormUserRepository implements domain/user.Repository using GORM + PostgreSQL.
type GormUserRepository struct {
    db *gorm.DB
}

func NewGormUserRepository(db *gorm.DB) *GormUserRepository {
    return &GormUserRepository{db: db}
}

func (r *GormUserRepository) Save(ctx context.Context, u *domainuser.User) error {
    m := toModel(u)
    if err := r.db.WithContext(ctx).Save(m).Error; err != nil {
        return fmt.Errorf("save user: %w", err)
    }
    return nil
}

func (r *GormUserRepository) FindByID(ctx context.Context, id domainuser.UserID) (*domainuser.User, error) {
    var m model.UserModel
    err := r.db.WithContext(ctx).First(&m, "id = ?", string(id)).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, domainuser.ErrNotFound
    }
    if err != nil {
        return nil, fmt.Errorf("find user by id: %w", err)
    }
    return toDomain(&m)
}

func (r *GormUserRepository) FindByEmail(ctx context.Context, email domainuser.Email) (*domainuser.User, error) {
    var m model.UserModel
    err := r.db.WithContext(ctx).
        Where("email = ? AND deleted_at IS NULL", email.String()).
        First(&m).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, domainuser.ErrNotFound
    }
    if err != nil {
        return nil, fmt.Errorf("find user by email: %w", err)
    }
    return toDomain(&m)
}

func (r *GormUserRepository) ExistsByEmail(ctx context.Context, email domainuser.Email) (bool, error) {
    var count int64
    err := r.db.WithContext(ctx).Model(&model.UserModel{}).
        Where("email = ? AND deleted_at IS NULL", email.String()).
        Count(&count).Error
    if err != nil {
        return false, fmt.Errorf("exists by email: %w", err)
    }
    return count > 0, nil
}

func (r *GormUserRepository) List(ctx context.Context, limit, offset int) ([]*domainuser.User, int64, error) {
    var models []model.UserModel
    var total int64

    base := r.db.WithContext(ctx).Model(&model.UserModel{}).
        Where("deleted_at IS NULL")

    if err := base.Count(&total).Error; err != nil {
        return nil, 0, fmt.Errorf("count users: %w", err)
    }
    if err := base.Limit(limit).Offset(offset).
        Order("created_at DESC").Find(&models).Error; err != nil {
        return nil, 0, fmt.Errorf("list users: %w", err)
    }

    users := make([]*domainuser.User, 0, len(models))
    for i := range models {
        u, err := toDomain(&models[i])
        if err != nil {
            return nil, 0, err
        }
        users = append(users, u)
    }
    return users, total, nil
}

func (r *GormUserRepository) Delete(ctx context.Context, id domainuser.UserID) error {
    result := r.db.WithContext(ctx).
        Where("id = ?", string(id)).
        Delete(&model.UserModel{})
    if result.Error != nil {
        return fmt.Errorf("delete user: %w", result.Error)
    }
    if result.RowsAffected == 0 {
        return domainuser.ErrNotFound
    }
    return nil
}
```

---

## HTTP response — BaseApiResponse

All Gin handlers return a consistent envelope. Never write raw `c.JSON` with ad-hoc shapes.

### response.go — internal/infrastructure/http/gin/response/response.go

```go
package response

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

// BaseApiResponse is the standard envelope for every API response.
//
// Success:
//   {"success": true,  "message": "user created", "data": {...}}
//
// Error:
//   {"success": false, "message": "email already registered", "data": null}
type BaseApiResponse[T any] struct {
    Success bool   `json:"success"`
    Message string `json:"message"`
    Data    T      `json:"data"`
}

// OK sends a 200 response with data.
func OK[T any](c *gin.Context, message string, data T) {
    c.JSON(http.StatusOK, BaseApiResponse[T]{
        Success: true,
        Message: message,
        Data:    data,
    })
}

// Created sends a 201 response with data.
func Created[T any](c *gin.Context, message string, data T) {
    c.JSON(http.StatusCreated, BaseApiResponse[T]{
        Success: true,
        Message: message,
        Data:    data,
    })
}

// NoContent sends a 204 response (no body).
func NoContent(c *gin.Context) {
    c.Status(http.StatusNoContent)
}

// Fail sends an error response. data is set to nil.
func Fail(c *gin.Context, status int, message string) {
    c.JSON(status, BaseApiResponse[any]{
        Success: false,
        Message: message,
        Data:    nil,
    })
}

// DomainError maps well-known domain sentinel errors to HTTP status + message.
// Call this at the end of every handler's error branch.
func DomainError(c *gin.Context, err error) {
    switch {
    case isDomainErr(err, "not found"):
        Fail(c, http.StatusNotFound, err.Error())
    case isDomainErr(err, "already registered"), isDomainErr(err, "already exists"):
        Fail(c, http.StatusConflict, err.Error())
    case isDomainErr(err, "unauthorized"):
        Fail(c, http.StatusUnauthorized, err.Error())
    case isDomainErr(err, "invalid"):
        Fail(c, http.StatusUnprocessableEntity, err.Error())
    default:
        Fail(c, http.StatusInternalServerError, "internal server error")
    }
}

func isDomainErr(err error, substr string) bool {
    return err != nil && containsFold(err.Error(), substr)
}

func containsFold(s, sub string) bool {
    return len(s) >= len(sub) &&
        (s == sub || len(s) > 0 && containsInsensitive(s, sub))
}

func containsInsensitive(s, sub string) bool {
    for i := 0; i <= len(s)-len(sub); i++ {
        if equalFold(s[i:i+len(sub)], sub) {
            return true
        }
    }
    return false
}

func equalFold(a, b string) bool {
    if len(a) != len(b) {
        return false
    }
    for i := range a {
        ca, cb := a[i], b[i]
        if ca >= 'A' && ca <= 'Z' { ca += 32 }
        if cb >= 'A' && cb <= 'Z' { cb += 32 }
        if ca != cb { return false }
    }
    return true
}
```

> Prefer using `errors.Is()` for sentinel matching. The string fallback above
> is a safety net — define your domain errors as sentinels and use `errors.Is`
> in `DomainError` for precision.

Better `DomainError` using `errors.Is`:

```go
import (
    "errors"
    domainuser "yourapp/internal/domain/user"
)

func DomainError(c *gin.Context, err error) {
    switch {
    case errors.Is(err, domainuser.ErrNotFound):
        Fail(c, http.StatusNotFound, err.Error())
    case errors.Is(err, domainuser.ErrEmailExists):
        Fail(c, http.StatusConflict, err.Error())
    case errors.Is(err, domainuser.ErrUnauthorized):
        Fail(c, http.StatusUnauthorized, err.Error())
    default:
        Fail(c, http.StatusInternalServerError, "internal server error")
    }
}
```

### Handler using the response helpers

```go
// internal/infrastructure/http/gin/handler/user_handler.go
package handler

import (
    "net/http"
    "github.com/gin-gonic/gin"
    userapp "yourapp/internal/application/user"
    "yourapp/internal/infrastructure/http/gin/response"
)

type UserHandler struct {
    create *userapp.CreateUserUseCase
    get    *userapp.GetUserUseCase
    list   *userapp.ListUsersUseCase
    delete *userapp.DeleteUserUseCase
}

func NewUserHandler(
    create *userapp.CreateUserUseCase,
    get    *userapp.GetUserUseCase,
    list   *userapp.ListUsersUseCase,
    del    *userapp.DeleteUserUseCase,
) *UserHandler {
    return &UserHandler{create: create, get: get, list: list, delete: del}
}

func (h *UserHandler) Create(c *gin.Context) {
    var req userapp.CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        response.Fail(c, http.StatusBadRequest, err.Error())
        return
    }
    resp, err := h.create.Execute(c.Request.Context(), req)
    if err != nil {
        response.DomainError(c, err)
        return
    }
    response.Created(c, "user created", resp)
}

func (h *UserHandler) GetByID(c *gin.Context) {
    id := c.Param("id")
    resp, err := h.get.Execute(c.Request.Context(), id)
    if err != nil {
        response.DomainError(c, err)
        return
    }
    response.OK(c, "ok", resp)
}

func (h *UserHandler) List(c *gin.Context) {
    var req userapp.ListUsersRequest
    if err := c.ShouldBindQuery(&req); err != nil {
        response.Fail(c, http.StatusBadRequest, err.Error())
        return
    }
    if req.Page == 0 { req.Page = 1 }
    if req.Limit == 0 { req.Limit = 20 }

    resp, err := h.list.Execute(c.Request.Context(), req)
    if err != nil {
        response.DomainError(c, err)
        return
    }
    response.OK(c, "ok", resp)
}

func (h *UserHandler) Delete(c *gin.Context) {
    id := c.Param("id")
    if err := h.delete.Execute(c.Request.Context(), id); err != nil {
        response.DomainError(c, err)
        return
    }
    response.NoContent(c)
}
```

---

## Test placement in the Go repository

### Rule: tests live next to the code they test, with one exception.

```
backend/
  internal/
    domain/
      user/
        entity.go
        entity_test.go             <- unit test, same package (_test suffix for black-box)
        value_objects.go
        value_objects_test.go

    application/
      user/
        create_user.go
        create_user_test.go        <- unit test with mock repository
        get_user.go
        get_user_test.go

    infrastructure/
      persistence/
        postgres/
          repository/
            user_repository.go
            user_repository_mapper.go
            user_repository_mapper_test.go  <- unit test, mapper only

  test/                            <- integration tests live here, separate from src
    integration/
      user_repository_test.go      <- real DB, build tag: integration
      order_repository_test.go
    testutil/
      db.go                        <- SetupTestDB(), TruncateTables()
      fixtures.go                  <- NewTestUser(), NewTestOrder() helpers
```

### Why `test/integration/` is separate

Integration tests need a real running database. They are slow, require setup,
and should not run during `go test ./...`. Keeping them in `test/integration/`
with a build tag makes it explicit and keeps unit test runs fast.

### Build tags

```go
// test/integration/user_repository_test.go
//go:build integration

package integration_test
```

Run unit tests only (default):

```bash
go test ./...
```

Run integration tests:

```bash
go test -tags=integration ./test/integration/...
```

Run everything:

```bash
go test -tags=integration ./...
```

### Test package naming convention

```go
// Black-box test (preferred for use cases and entities)
// file: create_user_test.go
package userapp_test   // note: _test suffix, external view

// White-box test (when you need access to unexported fields)
// file: entity_test.go
package user           // same package, no _test suffix
```

### testutil/db.go

```go
// test/testutil/db.go
package testutil

import (
    "testing"

    "github.com/stretchr/testify/require"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"

    "yourapp/internal/infrastructure/persistence/postgres/model"
)

// SetupTestDB opens a test DB connection and auto-migrates models.
// Registers a cleanup to truncate all tables after each test.
func SetupTestDB(t *testing.T) *gorm.DB {
    t.Helper()

    dsn := "host=localhost user=test password=test dbname=testdb port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Silent),
    })
    require.NoError(t, err, "open test DB")

    require.NoError(t, db.AutoMigrate(
        &model.UserModel{},
        &model.OrderModel{},
    ))

    t.Cleanup(func() {
        db.Exec("TRUNCATE TABLE orders, users RESTART IDENTITY CASCADE")
    })

    return db
}
```

### testutil/fixtures.go

```go
// test/testutil/fixtures.go
package testutil

import (
    "testing"

    "github.com/google/uuid"
    "github.com/stretchr/testify/require"

    domainuser "yourapp/internal/domain/user"
)

// NewTestUser creates and returns a valid domain User for use in tests.
func NewTestUser(t *testing.T, email, name string) *domainuser.User {
    t.Helper()
    e, err := domainuser.NewEmail(email)
    require.NoError(t, err)
    u, err := domainuser.NewUser(domainuser.UserID(uuid.NewString()), e, name, domainuser.RoleMember)
    require.NoError(t, err)
    return u
}
```

### Integration test example

```go
// test/integration/user_repository_test.go
//go:build integration

package integration_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"

    domainuser "yourapp/internal/domain/user"
    "yourapp/internal/infrastructure/persistence/postgres/repository"
    "yourapp/test/testutil"
)

func TestGormUserRepository_SaveAndFind(t *testing.T) {
    db := testutil.SetupTestDB(t)
    repo := repository.NewGormUserRepository(db)
    ctx := context.Background()

    user := testutil.NewTestUser(t, "jane@example.com", "Jane")

    t.Run("saves and finds by id", func(t *testing.T) {
        require.NoError(t, repo.Save(ctx, user))

        found, err := repo.FindByID(ctx, user.ID())
        require.NoError(t, err)
        assert.Equal(t, user.ID(), found.ID())
        assert.Equal(t, user.Email(), found.Email())
    })

    t.Run("returns ErrNotFound for unknown id", func(t *testing.T) {
        _, err := repo.FindByID(ctx, domainuser.UserID("does-not-exist"))
        assert.ErrorIs(t, err, domainuser.ErrNotFound)
    })

    t.Run("ExistsByEmail returns true after save", func(t *testing.T) {
        exists, err := repo.ExistsByEmail(ctx, user.Email())
        require.NoError(t, err)
        assert.True(t, exists)
    })
}
```

### Unit test example (use case with mock)

```go
// internal/application/user/create_user_test.go
package userapp_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"

    userapp "yourapp/internal/application/user"
    domainuser "yourapp/internal/domain/user"
)

func TestCreateUserUseCase_Execute(t *testing.T) {
    tests := []struct {
        name      string
        req       userapp.CreateUserRequest
        mockSetup func(*mockUserRepo)
        wantErr   error
    }{
        {
            name: "creates user successfully",
            req:  userapp.CreateUserRequest{Email: "a@b.com", Name: "Alice", Role: "member"},
            mockSetup: func(m *mockUserRepo) {
                m.existsByEmailFn = func(_ context.Context, _ domainuser.Email) (bool, error) { return false, nil }
                m.saveFn = func(_ context.Context, _ *domainuser.User) error { return nil }
            },
        },
        {
            name: "rejects duplicate email",
            req:  userapp.CreateUserRequest{Email: "dup@b.com", Name: "Dup", Role: "member"},
            mockSetup: func(m *mockUserRepo) {
                m.existsByEmailFn = func(_ context.Context, _ domainuser.Email) (bool, error) { return true, nil }
            },
            wantErr: domainuser.ErrEmailExists,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            repo := &mockUserRepo{}
            tt.mockSetup(repo)

            uc := userapp.NewCreateUserUseCase(repo)
            resp, err := uc.Execute(context.Background(), tt.req)

            if tt.wantErr != nil {
                require.ErrorIs(t, err, tt.wantErr)
                return
            }
            require.NoError(t, err)
            assert.NotEmpty(t, resp.ID)
            assert.Equal(t, "a@b.com", resp.Email)
        })
    }
}
```

---

## Makefile targets

```makefile
.PHONY: test test-integration wire lint

test:
	go test ./...

test-integration:
	go test -tags=integration ./test/integration/...

test-all:
	go test -tags=integration ./...

wire:
	wire gen ./cmd/

lint:
	go vet ./...
	staticcheck ./...

migrate-up:
	migrate -path internal/infrastructure/persistence/postgres/migrations \
	        -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path internal/infrastructure/persistence/postgres/migrations \
	        -database "$(DATABASE_URL)" down 1
```

---

## General Go rules

- No global state. All dependencies injected.
- `context.Context` is always the first argument of any IO-touching function.
- Wrap errors with context: `fmt.Errorf("operation name: %w", err)`.
- Functions under ~40 lines. Extract helpers early.
- Every exported type and function has a doc comment.
- Run `go vet ./...` and `staticcheck ./...` before committing.

---

## Shared pagination — internal/shared/pagination.go

Write once, embed everywhere. Never rewrite pagination logic per feature.

```go
package shared

type PaginationRequest struct {
    Page  int `form:"page"  json:"page"  binding:"omitempty,min=1"`
    Limit int `form:"limit" json:"limit" binding:"omitempty,min=1,max=100"`
}

func (p *PaginationRequest) Normalize() {
    if p.Page == 0   { p.Page = 1 }
    if p.Limit == 0  { p.Limit = 20 }
    if p.Limit > 100 { p.Limit = 100 }
}

func (p PaginationRequest) Offset() int {
    return (p.Page - 1) * p.Limit
}

// PaginatedResponse is the data payload inside the envelope.
type PaginatedResponse[T any] struct {
    Items      []T   `json:"items"`
    Total      int64 `json:"total"`
    Page       int   `json:"page"`
    Limit      int   `json:"limit"`
    TotalPages int   `json:"total_pages"`
    HasNext    bool  `json:"has_next"`
    HasPrev    bool  `json:"has_prev"`
}

// PaginatedResult is the full API envelope for list endpoints.
// Both success and error return this same shape — data is nil on error.
type PaginatedResult[T any] struct {
    Success bool                  `json:"success"`
    Message string                `json:"message"`
    Data    *PaginatedResponse[T] `json:"data"`
}

// NewPaginatedSuccess builds a successful paginated result.
func NewPaginatedSuccess[T any](items []T, total int64, req PaginationRequest) PaginatedResult[T] {
    totalPages := int(total) / req.Limit
    if int(total)%req.Limit != 0 {
        totalPages++
    }
    return PaginatedResult[T]{
        Success: true,
        Message: "ok",
        Data: &PaginatedResponse[T]{
            Items:      items,
            Total:      total,
            Page:       req.Page,
            Limit:      req.Limit,
            TotalPages: totalPages,
            HasNext:    req.Page < totalPages,
            HasPrev:    req.Page > 1,
        },
    }
}

// NewPaginatedError builds a failed paginated result. Data is nil.
func NewPaginatedError[T any](message string) PaginatedResult[T] {
    return PaginatedResult[T]{Success: false, Message: message, Data: nil}
}
```

### Response helpers — response/response.go

Add alongside the existing BaseApiResponse helpers:

```go
// OKPaginated sends a successful paginated list response.
func OKPaginated[T any](c *gin.Context, result shared.PaginatedResult[T]) {
    c.JSON(http.StatusOK, result)
}

// FailPaginated sends a failed paginated response — shape stays consistent.
func FailPaginated[T any](c *gin.Context, status int, message string) {
    c.JSON(status, shared.NewPaginatedError[T](message))
}
```

### DTO — embed PaginationRequest

```go
// application/user/dto.go
type ListUsersRequest struct {
    shared.PaginationRequest
    Role string `form:"role" binding:"omitempty,oneof=admin member viewer"`
}
```

### Use case — Normalize + NewPaginatedSuccess/Error

```go
// application/user/list_users.go
func (uc *ListUsersUseCase) Execute(ctx context.Context, req ListUsersRequest) (shared.PaginatedResult[UserResponse], error) {
    req.Normalize()

    users, total, err := uc.repo.List(ctx, req.Limit, req.Offset())
    if err != nil {
        return shared.NewPaginatedError[UserResponse]("failed to list users"), err
    }

    items := make([]UserResponse, len(users))
    for i, u := range users {
        items[i] = ToResponse(u)
    }

    return shared.NewPaginatedSuccess(items, total, req.PaginationRequest), nil
}
```

### Handler — thin, uses OKPaginated

```go
func (h *UserHandler) List(c *gin.Context) {
    var req userapp.ListUsersRequest
    if err := c.ShouldBindQuery(&req); err != nil {
        response.FailPaginated[userapp.UserResponse](c, http.StatusBadRequest, err.Error())
        return
    }
    result, err := h.list.Execute(c.Request.Context(), req)
    if err != nil {
        response.DomainError(c, err)
        return
    }
    response.OKPaginated(c, result)
}
```

### JSON shapes

Success:

```json
{
  "success": true,
  "message": "ok",
  "data": {
    "items": [...],
    "total": 47,
    "page": 2,
    "limit": 20,
    "total_pages": 3,
    "has_next": true,
    "has_prev": true
  }
}
```

Error:

```json
{
    "success": false,
    "message": "failed to list users",
    "data": null
}
```

### Rules

- Never write page/limit/offset logic in a use case or handler directly.
- Always embed shared.PaginationRequest in list request DTOs.
- Always call req.Normalize() as the first line of a list use case.
- Use NewPaginatedSuccess() on the happy path.
- Use NewPaginatedError() when returning an error — keeps the shape consistent.
- Use response.OKPaginated() in handlers for list endpoints.
- Use response.FailPaginated[T]() for binding errors on list endpoints.
- Handler never touches Page, Limit, or Offset — use case territory only.
