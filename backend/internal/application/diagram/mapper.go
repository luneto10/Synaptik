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

func toDomainTable(req DbTableRequest) (diagram.DbTable, error) {
	columns := make([]diagram.DbColumn, 0, len(req.Columns))
	for _, c := range req.Columns {
		col, err := toDomainColumn(c)
		if err != nil {
			return diagram.DbTable{}, fmt.Errorf("table %q: %w", req.Name, err)
		}
		columns = append(columns, col)
	}
	return diagram.NewDbTable(diagram.TableID(req.ID), req.Name, columns), nil
}

func toDomainRelationship(req RelationshipRequest) (diagram.Relationship, error) {
	relType, err := diagram.NewRelationshipType(req.RelationshipType)
	if err != nil {
		return diagram.Relationship{}, err
	}
	return diagram.NewRelationship(
		diagram.EdgeID(req.ID),
		diagram.ColumnID(req.SourceColumnID),
		diagram.ColumnID(req.TargetColumnID),
		relType,
	), nil
}

// ToDomainDiagram maps a DiagramRequest to domain entities ready for the use case.
func ToDomainDiagram(req DiagramRequest) ([]diagram.DbTable, []diagram.Relationship, error) {
	tables := make([]diagram.DbTable, 0, len(req.Tables))
	for _, t := range req.Tables {
		table, err := toDomainTable(t)
		if err != nil {
			return nil, nil, err
		}
		tables = append(tables, table)
	}

	rels := make([]diagram.Relationship, 0, len(req.Relationships))
	for _, r := range req.Relationships {
		rel, err := toDomainRelationship(r)
		if err != nil {
			return nil, nil, err
		}
		rels = append(rels, rel)
	}

	return tables, rels, nil
}
