package diagramapp

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func toDomainTable(req DbTableRequest) (diagram.DbTable, error) {
	columns := make([]diagram.DbColumn, 0, len(req.Columns))
	for _, c := range req.Columns {
		col, err := toDomainColumn(c)
		if err != nil {
			return diagram.DbTable{}, fmt.Errorf("table %q: %w", req.Name, err)
		}
		columns = append(columns, col)
	}

	var t diagram.DbTable
	if req.IsJunction {
		t = diagram.NewJunctionTable(diagram.TableID(req.ID), req.Name, columns)
	} else {
		t = diagram.NewDbTable(diagram.TableID(req.ID), req.Name, columns)
	}

	if err := diagram.ValidateTable(t); err != nil {
		return diagram.DbTable{}, err
	}
	return t, nil
}
