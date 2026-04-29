package sqlgen

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

type columnContext struct {
	compositePrimaryKey bool
	reference           *columnInfo
}

type Dialect interface {
	ID() diagram.Dialect
	CreateTable(tableName string, columnDefs []string) string
	BuildColumnDefinition(column diagram.DbColumn, ctx columnContext) (string, error)
	BuildCompositePrimaryKey(columns []string) string
}

var dialectRegistry = map[diagram.Dialect]Dialect{}

func RegisterDialect(dialect Dialect) {
	dialectRegistry[dialect.ID()] = dialect
	diagram.RegisterDialect(dialect.ID())
}

func getDialect(id diagram.Dialect) (Dialect, error) {
	dialect, ok := dialectRegistry[id]
	if !ok {
		return nil, fmt.Errorf("unsupported dialect %q: %w", id, apperrors.ErrInvalid)
	}
	return dialect, nil
}
