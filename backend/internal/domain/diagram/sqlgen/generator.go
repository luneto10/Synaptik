package sqlgen

import (
	"strings"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

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

	var createStmts, fkStmts []string
	for _, t := range ordered {
		colDefs, tableFKs := buildTableDDL(t, colIndex)
		fkStmts = append(fkStmts, tableFKs...)
		createStmts = append(createStmts, CreateTable(t.Name(), colDefs))
	}

	return strings.Join(append(createStmts, fkStmts...), "\n\n"), nil
}
