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

// buildTableDDLForDialect returns the column definition lines for a CREATE TABLE statement.
// FK references are emitted inline (e.g. REFERENCES users (id)) rather than as
// separate ALTER TABLE statements — this is only safe because sortByDependency
// guarantees referenced tables always precede the tables that depend on them.
// Circular FK dependencies are rejected upstream, so ALTER TABLE is never needed.
func buildTableDDLForDialect(dialect Dialect, t diagram.DbTable, colIndex map[diagram.ColumnID]columnInfo) ([]string, error) {
	pkCols := getPrimaryKeyColumns(t)
	compositePK := t.IsJunction() && len(pkCols) > 1

	colDefs := make([]string, 0, len(t.Columns())+1)
	for _, c := range t.Columns() {
		var reference *columnInfo
		if c.References() != nil {
			if info, ok := colIndex[c.References().ColumnID()]; ok {
				copied := info
				reference = &copied
			}
		}

		columnDef, err := dialect.BuildColumnDefinition(c, columnContext{
			compositePrimaryKey: compositePK,
			reference:           reference,
		})
		if err != nil {
			return nil, err
		}
		colDefs = append(colDefs, columnDef)
	}

	if compositePK {
		colDefs = append(colDefs, dialect.BuildCompositePrimaryKey(pkCols))
	}
	return colDefs, nil
}
