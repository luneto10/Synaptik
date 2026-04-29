package sqlgen

import "github.com/luneto10/synaptik/backend/internal/domain/diagram"

// Generate converts domain tables into PostgreSQL DDL.
func Generate(tables []diagram.DbTable, rels []diagram.Relationship) (string, error) {
	return GenerateForDialect(diagram.DialectPostgres, tables, rels)
}

// GenerateForDialect converts domain tables into DDL for the requested SQL dialect.
func GenerateForDialect(dialectID diagram.Dialect, tables []diagram.DbTable, rels []diagram.Relationship) (string, error) {
	if len(tables) == 0 {
		return "", nil
	}

	dialect, err := getDialect(dialectID)
	if err != nil {
		return "", err
	}

	colIndex := buildColumnIndex(tables)
	allTables := resolveManyToMany(tables, rels, colIndex)

	ordered, err := sortByDependency(allTables)
	if err != nil {
		return "", err
	}

	// Rebuild index including generated junction tables for FK resolution.
	colIndex = buildColumnIndex(allTables)

	b := newDDLBuilder(dialect, len(ordered))
	for _, t := range ordered {
		if err := b.add(t, colIndex); err != nil {
			return "", err
		}
	}
	return b.build(), nil
}
