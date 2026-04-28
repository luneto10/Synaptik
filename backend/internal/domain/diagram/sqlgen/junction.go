package sqlgen

import (
	"fmt"
	"sort"

	"github.com/jinzhu/inflection"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func resolveManyToMany(tables []diagram.DbTable, rels []diagram.Relationship, colIndex map[diagram.ColumnID]columnInfo) []diagram.DbTable {
	all := append([]diagram.DbTable{}, tables...)
	processed := make(map[string]bool)

	for _, t := range tables {
		if t.IsJunction() {
			processed[t.Name()] = true
		}
	}

	for _, r := range rels {
		if r.RelationshipType() != diagram.RelationshipManyToMany {
			continue
		}

		src, ok1 := colIndex[r.SourceColumnID()]
		tgt, ok2 := colIndex[r.TargetColumnID()]
		if !ok1 || !ok2 {
			continue
		}

		// Deterministic junction name using singularized table names
		srcSingular := inflection.Singular(src.tableName)
		tgtSingular := inflection.Singular(tgt.tableName)

		names := []string{srcSingular, tgtSingular}
		sort.Strings(names)
		junctionName := fmt.Sprintf("%s_%s", names[0], names[1])

		if processed[junctionName] {
			continue
		}
		processed[junctionName] = true

		// Create junction table
		// Columns: src_table_id, tgt_table_id (using referenced types)
		srcColName := fmt.Sprintf("%s_id", srcSingular)
		tgtColName := fmt.Sprintf("%s_id", tgtSingular)
		
		// If table names are same (self-referencing many-to-many), append roles
		if src.tableName == tgt.tableName {
			srcColName = "source_id"
			tgtColName = "target_id"
		}

		srcRef := diagram.NewColumnReference(diagram.TableID(src.tableID), r.SourceColumnID())
		tgtRef := diagram.NewColumnReference(diagram.TableID(tgt.tableID), r.TargetColumnID())

		cols := []diagram.DbColumn{
			diagram.NewDbColumn(
				diagram.ColumnID(junctionName+"_"+srcColName),
				srcColName,
				diagram.ColumnType(colIndex[r.SourceColumnID()].columnType),
				true,  // PK
				true,  // FK
				false, // Not null
				false, // Unique (composite PK handles it)
				&srcRef,
			),
			diagram.NewDbColumn(
				diagram.ColumnID(junctionName+"_"+tgtColName),
				tgtColName,
				diagram.ColumnType(colIndex[r.TargetColumnID()].columnType),
				true,  // PK
				true,  // FK
				false, // Not null
				false, // Unique
				&tgtRef,
			),
		}

		all = append(all, diagram.NewJunctionTable(diagram.TableID(junctionName), junctionName, cols))
	}

	return all
}
