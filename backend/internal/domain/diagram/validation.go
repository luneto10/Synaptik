package diagram

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
)

// ValidateTable checks domain invariants for a table that cannot be enforced
// in the constructor without returning an error (e.g. uniqueness across the column slice).
func ValidateTable(t DbTable) error {
	seen := make(map[string]struct{}, len(t.Columns()))
	for _, c := range t.Columns() {
		if _, exists := seen[c.Name()]; exists {
			return fmt.Errorf("table %q: duplicate column name %q: %w", t.Name(), c.Name(), apperrors.ErrInvalid)
		}
		seen[c.Name()] = struct{}{}
		if err := c.ValidateTypeOptions(); err != nil {
			return fmt.Errorf("table %q: %w", t.Name(), err)
		}
	}
	return nil
}

// ValidateDiagram checks cross-table invariants: FK targets and relationship endpoints
// must reference tables and columns present in the diagram.
func ValidateDiagram(tables []DbTable, rels []Relationship) error {
	tableIDs, columnIDs, tableColumnIDs, err := indexDiagramIDs(tables)
	if err != nil {
		return err
	}
	for _, t := range tables {
		for _, c := range t.Columns() {
			if err := c.validateReferenceIfPresent(tableIDs, tableColumnIDs); err != nil {
				return err
			}
		}
	}
	for _, r := range rels {
		if err := r.ValidateEndpoints(columnIDs); err != nil {
			return err
		}
	}
	return nil
}

func indexDiagramIDs(tables []DbTable) (map[TableID]struct{}, map[ColumnID]struct{}, map[TableID]map[ColumnID]struct{}, error) {
	tableIDs := make(map[TableID]struct{}, len(tables))
	tableNames := make(map[string]struct{}, len(tables))
	columnIDs := make(map[ColumnID]struct{})
	tableColumnIDs := make(map[TableID]map[ColumnID]struct{}, len(tables))
	for _, t := range tables {
		if _, exists := tableIDs[t.ID()]; exists {
			return nil, nil, nil, fmt.Errorf("duplicate table id %q: %w", t.ID(), apperrors.ErrInvalid)
		}
		if _, exists := tableNames[t.Name()]; exists {
			return nil, nil, nil, fmt.Errorf("duplicate table name %q: %w", t.Name(), apperrors.ErrInvalid)
		}
		tableIDs[t.ID()] = struct{}{}
		tableNames[t.Name()] = struct{}{}
		tableColumnIDs[t.ID()] = make(map[ColumnID]struct{}, len(t.Columns()))
		for _, c := range t.Columns() {
			if _, exists := columnIDs[c.ID()]; exists {
				return nil, nil, nil, fmt.Errorf("duplicate column id %q: %w", c.ID(), apperrors.ErrInvalid)
			}
			columnIDs[c.ID()] = struct{}{}
			tableColumnIDs[t.ID()][c.ID()] = struct{}{}
		}
	}
	return tableIDs, columnIDs, tableColumnIDs, nil
}
