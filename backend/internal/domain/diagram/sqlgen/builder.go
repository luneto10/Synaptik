package sqlgen

import (
	"strings"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

// ddlBuilder accumulates CREATE TABLE statements in dependency order.
// FK references are inline within each CREATE TABLE, so no deferred ALTER TABLE
// statements are needed.
type ddlBuilder struct {
	stmts []string
}

func newDDLBuilder(tableCount int) ddlBuilder {
	return ddlBuilder{stmts: make([]string, 0, tableCount)}
}

func (b *ddlBuilder) add(t diagram.DbTable, colIndex map[diagram.ColumnID]columnInfo) {
	b.stmts = append(b.stmts, CreateTable(t.Name(), buildTableDDL(t, colIndex)))
}

func (b *ddlBuilder) build() string {
	return strings.Join(b.stmts, "\n\n")
}
