package diagramapp

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func toDomainColumn(req DbColumnRequest) (diagram.DbColumn, error) {
	colType, err := diagram.NewColumnType(req.Type)
	if err != nil {
		return diagram.DbColumn{}, fmt.Errorf("column %q: %w", req.Name, err)
	}

	var ref *diagram.ColumnReference
	if req.References != nil {
		r := diagram.NewColumnReference(
			diagram.TableID(req.References.TableID),
			diagram.ColumnID(req.References.ColumnID),
		)
		ref = &r
	}

	return diagram.NewDbColumn(
		diagram.ColumnID(req.ID),
		req.Name,
		colType,
		req.IsPrimaryKey,
		req.IsForeignKey,
		req.IsNullable,
		req.IsUnique,
		ref,
	), nil
}
