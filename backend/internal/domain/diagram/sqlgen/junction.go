package sqlgen

import (
	"fmt"

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

		srcSingular := inflection.Singular(src.tableName)
		tgtSingular := inflection.Singular(tgt.tableName)

		a, b := srcSingular, tgtSingular
		if a > b {
			a, b = b, a
		}
		junctionName := a + "_" + b

		if processed[junctionName] {
			continue
		}
		processed[junctionName] = true

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
				diagram.ColumnType(src.columnType),
				true,  // PK
				true,  // FK
				false, // Not null
				false, // Unique (composite PK handles it)
				&srcRef,
			),
			diagram.NewDbColumn(
				diagram.ColumnID(junctionName+"_"+tgtColName),
				tgtColName,
				diagram.ColumnType(tgt.columnType),
				true,  // PK
				true,  // FK
				false, // Not null
				false, // Unique (composite PK handles it)
				&tgtRef,
			),
		}

		all = append(all, diagram.NewJunctionTable(diagram.TableID(junctionName), junctionName, cols))
	}

	return all
}
