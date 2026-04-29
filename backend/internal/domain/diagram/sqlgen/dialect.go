package sqlgen

import (
	"fmt"
	"sort"
	"strings"

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
}

func getDialect(id diagram.Dialect) (Dialect, error) {
	dialect, ok := dialectRegistry[id]
	if !ok {
		return nil, fmt.Errorf("unsupported dialect %q: %w", id, apperrors.ErrInvalid)
	}
	return dialect, nil
}

func RegisteredDialects() []diagram.Dialect {
	ids := make([]diagram.Dialect, 0, len(dialectRegistry))
	for id := range dialectRegistry {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool {
		return strings.Compare(string(ids[i]), string(ids[j])) < 0
	})
	return ids
}
