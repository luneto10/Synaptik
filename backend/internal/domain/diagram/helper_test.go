package diagram_test

import "github.com/luneto10/synaptik/backend/internal/domain/diagram"

func newDbColumn(
	id diagram.ColumnID,
	name string,
	columnType diagram.ColumnType,
	isPrimaryKey, isForeignKey, isNullable, isUnique bool,
	references *diagram.ColumnReference,
) diagram.DbColumn {
	return diagram.NewDbColumn(id, name, columnType, diagram.DbColumnProps{
		IsPrimaryKey: isPrimaryKey,
		IsForeignKey: isForeignKey,
		IsNullable:   isNullable,
		IsUnique:     isUnique,
		References:   references,
	})
}
