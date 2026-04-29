package diagramapp

import "github.com/luneto10/synaptik/backend/internal/domain/diagram"

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
