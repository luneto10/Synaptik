package sqlgen

import (
	"strings"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram/ddlspec"
)

// ddlBuilder accumulates CREATE TABLE statements in dependency order.
// FK references are inline within each CREATE TABLE, so no deferred ALTER TABLE
// statements are needed.
type ddlBuilder struct {
	dialect ddlspec.Dialect
	stmts   []string
}

func newDDLBuilder(dialect ddlspec.Dialect, tableCount int) ddlBuilder {
	return ddlBuilder{
		dialect: dialect,
		stmts:   make([]string, 0, tableCount),
	}
}

func (b *ddlBuilder) add(t diagram.DbTable, colIndex map[diagram.ColumnID]ddlspec.ColumnInfo) error {
	columnDefs, err := buildTableDDLForDialect(b.dialect, t, colIndex)
	if err != nil {
		return err
	}
	b.stmts = append(b.stmts, b.dialect.CreateTable(t.Name(), columnDefs))
	return nil
}

func (b *ddlBuilder) build() string {
	return strings.Join(b.stmts, "\n\n")
}
