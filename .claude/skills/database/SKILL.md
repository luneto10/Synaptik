---
name: database
description: >
    Use when writing database migrations, GORM model definitions, query
    optimisation, index design, or anything touching PostgreSQL schema.
    Load alongside the backend skill.
---

# Database conventions — PostgreSQL + GORM + golang-migrate

## Migrations

Tool: golang-migrate (github.com/golang-migrate/migrate/v4)
Location: internal/infrastructure/persistence/migrations/

### File naming

Every migration is two files:
000001_create_users.up.sql
000001_create_users.down.sql

Rules:

- Sequential integer prefix, zero-padded to 6 digits.
- Snake case, descriptive name: what the migration does.
- up.sql must be fully reversible by down.sql.
- Never modify an applied migration — always add a new one.
- Test both up and down before committing.

### Migration template

```sql
-- 000002_create_orders.up.sql
CREATE TABLE orders (
    id          VARCHAR(36)      PRIMARY KEY,
    user_id     VARCHAR(36)      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20)      NOT NULL DEFAULT 'pending',
    total_cents BIGINT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_orders_user_id  ON orders(user_id);
CREATE INDEX idx_orders_status   ON orders(status);
CREATE INDEX idx_orders_deleted  ON orders(deleted_at) WHERE deleted_at IS NULL;
```

```sql
-- 000002_create_orders.down.sql
DROP TABLE IF EXISTS orders;
```

### Running migrations

```go
// internal/infrastructure/persistence/db.go
func RunMigrations(db *sql.DB, migrationsPath string) error {
    driver, err := postgres.WithInstance(db, &postgres.Config{})
    if err != nil {
        return fmt.Errorf("migration driver: %w", err)
    }
    m, err := migrate.NewWithDatabaseInstance(
        "file://"+migrationsPath, "postgres", driver,
    )
    if err != nil {
        return fmt.Errorf("migration init: %w", err)
    }
    if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
        return fmt.Errorf("migration up: %w", err)
    }
    return nil
}
```

---

## GORM model conventions

- One model file per table: model/<table_singular>.go.
- Always implement TableName() string explicitly.
- Use gorm.DeletedAt for soft deletes (adds deleted_at index automatically).
- Store monetary values as BIGINT cents — never DECIMAL or FLOAT for money.
- Store UUIDs as VARCHAR(36) — generated in Go before insert, not by the DB.
- All timestamps are TIMESTAMPTZ (timezone-aware).

```go
// model/order.go
type OrderModel struct {
    ID         string         `gorm:"primaryKey;type:varchar(36)"`
    UserID     string         `gorm:"not null;index;type:varchar(36)"`
    Status     string         `gorm:"not null;default:'pending'"`
    TotalCents int64          `gorm:"not null;default:0"`
    CreatedAt  time.Time      `gorm:"autoCreateTime"`
    UpdatedAt  time.Time      `gorm:"autoUpdateTime"`
    DeletedAt  gorm.DeletedAt `gorm:"index"`

    // associations (load explicitly — no auto-preload)
    User *UserModel `gorm:"foreignKey:UserID"`
}

func (OrderModel) TableName() string { return "orders" }
```

---

## Query patterns

### Pagination

Always use LIMIT + OFFSET. Return total count separately.

```go
func (r *GormOrderRepository) List(ctx context.Context, userID string, limit, offset int) ([]*domain.Order, int64, error) {
    var models []model.OrderModel
    var total int64

    base := r.db.WithContext(ctx).Model(&model.OrderModel{}).
        Where("user_id = ? AND deleted_at IS NULL", userID)

    if err := base.Count(&total).Error; err != nil {
        return nil, 0, fmt.Errorf("count orders: %w", err)
    }
    if err := base.Limit(limit).Offset(offset).
        Order("created_at DESC").Find(&models).Error; err != nil {
        return nil, 0, fmt.Errorf("list orders: %w", err)
    }

    orders := make([]*domain.Order, 0, len(models))
    for i := range models {
        o, err := toDomain(&models[i])
        if err != nil {
            return nil, 0, err
        }
        orders = append(orders, o)
    }
    return orders, total, nil
}
```

### Transactions

Use db.Transaction() for operations that must succeed or fail together.

```go
func (r *GormOrderRepository) CreateWithItems(ctx context.Context, order *domain.Order, items []*domain.OrderItem) error {
    return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        if err := tx.Save(toModel(order)).Error; err != nil {
            return fmt.Errorf("save order: %w", err)
        }
        for _, item := range items {
            if err := tx.Save(toItemModel(item)).Error; err != nil {
                return fmt.Errorf("save item: %w", err)
            }
        }
        return nil
    })
}
```

### Preloading associations

Never use auto-preload (gorm:"preload:all").
Load associations explicitly and only when needed.

```go
// explicit preload
r.db.WithContext(ctx).Preload("Items").First(&m, "id = ?", id)

// never do this
r.db.WithContext(ctx).Preload(clause.Associations).Find(&models)
```

---

## Indexing rules

- Every foreign key column gets an index.
- Columns used in WHERE filters get an index.
- Partial index for soft deletes: WHERE deleted_at IS NULL.
- Composite index when queries filter on multiple columns together.
- Never index columns with very low cardinality (boolean, enum with 2 values).
- Review EXPLAIN ANALYZE before adding indexes to production.

---

## Money

Always store monetary amounts as integer cents (BIGINT).
Never use FLOAT, DOUBLE, or DECIMAL for currency.

```go
// domain: Money value object
type Money struct {
    cents    int64
    currency string
}

func NewMoney(cents int64, currency string) (Money, error) {
    if cents < 0 {
        return Money{}, errors.New("amount cannot be negative")
    }
    return Money{cents: cents, currency: currency}, nil
}

func (m Money) Cents() int64      { return m.cents }
func (m Money) Currency() string  { return m.currency }
func (m Money) Add(o Money) (Money, error) {
    if m.currency != o.currency {
        return Money{}, errors.New("currency mismatch")
    }
    return Money{cents: m.cents + o.cents, currency: m.currency}, nil
}
```

---

## DB connection setup

```go
// internal/infrastructure/persistence/db.go
func NewDB(cfg *config.Config) (*gorm.DB, error) {
    db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Warn),
        NowFunc: func() time.Time { return time.Now().UTC() },
    })
    if err != nil {
        return nil, fmt.Errorf("open db: %w", err)
    }

    sqlDB, err := db.DB()
    if err != nil {
        return nil, fmt.Errorf("get sql db: %w", err)
    }

    sqlDB.SetMaxOpenConns(25)
    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetConnMaxLifetime(5 * time.Minute)

    return db, nil
}
```

---

## Do not

- No raw string queries with fmt.Sprintf — use parameterised queries.
- No auto-migrate in production — use golang-migrate only.
- No FLOAT for money.
- No DB-generated UUIDs — generate in Go before insert.
- No modifying applied migrations.
- No Preload(clause.Associations).
