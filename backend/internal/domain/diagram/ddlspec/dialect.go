package ddlspec

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

// ColumnInfo holds resolved table/column names for FK inline DDL and junction logic.
type ColumnInfo struct {
	TableID    string
	TableName  string
	ColumnName string
	ColumnType string
}

// ColumnContext is passed to Dialect.BuildColumnDefinition for composite PK and FK layout.
type ColumnContext struct {
	CompositePrimaryKey bool
	Reference           *ColumnInfo
}

// Dialect maps domain columns to SQL for a specific engine.
type Dialect interface {
	ID() diagram.Dialect
	CreateTable(tableName string, columnDefs []string) string
	BuildColumnDefinition(column diagram.DbColumn, ctx ColumnContext) (string, error)
	BuildCompositePrimaryKey(columns []string) string
}

var dialectRegistry = map[diagram.Dialect]Dialect{}

// RegisterDialect adds a dialect implementation and records it with the diagram package.
func RegisterDialect(dialect Dialect) {
	dialectRegistry[dialect.ID()] = dialect
	diagram.RegisterDialect(dialect.ID())
}

// DialectFor returns a registered dialect implementation.
func DialectFor(id diagram.Dialect) (Dialect, error) {
	dialect, ok := dialectRegistry[id]
	if !ok {
		return nil, fmt.Errorf("unsupported dialect %q: %w", id, apperrors.ErrInvalid)
	}
	return dialect, nil
}
