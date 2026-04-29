package sqlgen

import "github.com/luneto10/synaptik/backend/internal/domain/diagram"

func getPrimaryKeyColumns(t diagram.DbTable) []string {
	var names []string
	for _, c := range t.Columns() {
		if c.IsPrimaryKey() {
			names = append(names, c.Name())
		}
	}
	return names
}

// buildTableDDL returns the column definition lines for a CREATE TABLE statement.
// FK references are emitted inline (e.g. REFERENCES users (id)) rather than as
// separate ALTER TABLE statements — this is only safe because sortByDependency
// guarantees referenced tables always precede the tables that depend on them.
// Circular FK dependencies are rejected upstream, so ALTER TABLE is never needed.
func buildTableDDL(t diagram.DbTable, colIndex map[diagram.ColumnID]columnInfo) []string {
	pkCols := getPrimaryKeyColumns(t)
	compositePK := t.IsJunction() && len(pkCols) > 1

	colDefs := make([]string, 0, len(t.Columns())+1)
	for _, c := range t.Columns() {
		var mods []string

		if c.IsPrimaryKey() && !compositePK {
			mods = append(mods, PrimaryKey())
		}
		// Composite-PK columns need explicit NOT NULL; regular PK implies it.
		if !c.IsNullable() && (!c.IsPrimaryKey() || compositePK) {
			mods = append(mods, NotNull())
		}
		if c.IsUnique() && !c.IsPrimaryKey() {
			mods = append(mods, Unique())
		}
		if c.References() != nil {
			if info, ok := colIndex[c.References().ColumnID()]; ok {
				mods = append(mods, InlineReference(info.tableName, info.columnName))
			}
		}

		colDefs = append(colDefs, ColumnDef(c.Name(), string(c.Type()), mods...))
	}

	if compositePK {
		colDefs = append(colDefs, CompositePrimaryKey(pkCols...))
	}
	return colDefs
}
