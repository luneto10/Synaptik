package sqlgen

import "github.com/luneto10/synaptik/backend/internal/domain/diagram"

// Generate converts domain tables into PostgreSQL DDL.
func Generate(tables []diagram.DbTable, rels []diagram.Relationship) (string, error) {
	if len(tables) == 0 {
		return "", nil
	}

	colIndex := buildColumnIndex(tables)
	allTables := resolveManyToMany(tables, rels, colIndex)

	ordered, err := sortByDependency(allTables)
	if err != nil {
		return "", err
	}

	// Rebuild index including generated junction tables for FK resolution.
	colIndex = buildColumnIndex(allTables)

	b := newDDLBuilder(len(ordered))
	for _, t := range ordered {
		b.add(t, colIndex)
	}
	return b.build(), nil
}

