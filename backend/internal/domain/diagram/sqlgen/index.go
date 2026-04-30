package sqlgen

import (
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram/ddlspec"
)

// buildColumnIndex creates a lookup map from ColumnID to table/column names,
// used to resolve FK references during DDL generation.
func buildColumnIndex(tables []diagram.DbTable) map[diagram.ColumnID]ddlspec.ColumnInfo {
	idx := make(map[diagram.ColumnID]ddlspec.ColumnInfo)
	for _, t := range tables {
		for _, c := range t.Columns() {
			idx[c.ID()] = ddlspec.ColumnInfo{
				TableID:    string(t.ID()),
				TableName:  t.Name(),
				ColumnName: c.Name(),
				ColumnType: string(c.Type()),
			}
		}
	}
	return idx
}
