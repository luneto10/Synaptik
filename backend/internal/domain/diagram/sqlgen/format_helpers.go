package sqlgen

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func columnDef(c diagram.DbColumn) string {
	var mods []string
	if c.IsPrimaryKey() {
		mods = append(mods, PrimaryKey())
	}
	if !c.IsNullable() && !c.IsPrimaryKey() {
		mods = append(mods, NotNull())
	}
	if c.IsUnique() && !c.IsPrimaryKey() {
		mods = append(mods, Unique())
	}
	return ColumnDef(c.Name(), string(c.Type()), mods...)
}

func foreignKey(t diagram.DbTable, c diagram.DbColumn, colIndex map[diagram.ColumnID]columnInfo) (string, bool) {
	info, ok := colIndex[c.References().ColumnID()]
	if !ok {
		return "", false
	}
	constraint := fmt.Sprintf("%s_%s", t.Name(), c.Name())
	return AddForeignKey(t.Name(), constraint, c.Name(), info.tableName, info.columnName), true
}

// Used when building junction table composite-PK columns.
func modsWithoutPK(c diagram.DbColumn) []string {
	var mods []string
	if !c.IsNullable() {
		mods = append(mods, NotNull())
	}
	if c.IsUnique() {
		mods = append(mods, Unique())
	}
	return mods
}

func getPrimaryKeyColumns(t diagram.DbTable) []string {
	var names []string
	for _, c := range t.Columns() {
		if c.IsPrimaryKey() {
			names = append(names, c.Name())
		}
	}
	return names
}

func buildTableDDL(t diagram.DbTable, colIndex map[diagram.ColumnID]columnInfo) (colDefs []string, fkStmts []string) {
	for _, c := range t.Columns() {
		colDefs = append(colDefs, columnDef(c))
		if c.References() != nil {
			if fk, ok := foreignKey(t, c, colIndex); ok {
				fkStmts = append(fkStmts, fk)
			}
		}
	}
	colDefs = applyCompositePK(t, colDefs)
	return
}

func applyCompositePK(t diagram.DbTable, colDefs []string) []string {
	pkCols := getPrimaryKeyColumns(t)
	if !t.IsJunction() || len(pkCols) <= 1 {
		return colDefs
	}
	for i, c := range t.Columns() {
		if c.IsPrimaryKey() {
			colDefs[i] = ColumnDef(c.Name(), string(c.Type()), modsWithoutPK(c)...)
		}
	}
	return append(colDefs, CompositePrimaryKey(pkCols...))
}
