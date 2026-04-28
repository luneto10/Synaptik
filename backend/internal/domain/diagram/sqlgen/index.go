package sqlgen

import "github.com/luneto10/synaptik/backend/internal/domain/diagram"

type columnInfo struct {
	tableID    string
	tableName  string
	columnName string
	columnType string
}

// buildColumnIndex creates a lookup map from ColumnID to table/column names,
// used to resolve FK references during DDL generation.
func buildColumnIndex(tables []diagram.DbTable) map[diagram.ColumnID]columnInfo {
	idx := make(map[diagram.ColumnID]columnInfo)
	for _, t := range tables {
		for _, c := range t.Columns() {
			idx[c.ID()] = columnInfo{
				tableID:    string(t.ID()),
				tableName:  t.Name(),
				columnName: c.Name(),
				columnType: string(c.Type()),
			}
		}
	}
	return idx
}
