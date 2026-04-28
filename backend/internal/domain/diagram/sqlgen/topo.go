package sqlgen

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

// sortByDependency orders tables so that referenced tables appear before the tables
// that depend on them (Kahn's BFS topological sort).
//
// Complexity: O(T + FK) where T = number of tables, FK = number of foreign keys.
// Returns an error wrapping apperrors.ErrInvalid if a circular FK dependency is detected.
func sortByDependency(tables []diagram.DbTable) ([]diagram.DbTable, error) {
	index := make(map[diagram.TableID]diagram.DbTable, len(tables))
	for _, t := range tables {
		index[t.ID()] = t
	}

	// inDegree[A] = number of distinct tables A depends on via FK columns.
	inDegree := make(map[diagram.TableID]int, len(tables))
	// dependents[B] = tables that have at least one FK pointing into B.
	dependents := make(map[diagram.TableID][]diagram.TableID)

	for _, t := range tables {
		inDegree[t.ID()] = 0
	}

	for _, t := range tables {
		counted := make(map[diagram.TableID]bool)
		for _, col := range t.Columns() {
			if col.References() == nil {
				continue
			}
			refID := col.References().TableID()
			if refID == t.ID() || counted[refID] {
				continue
			}
			counted[refID] = true
			inDegree[t.ID()]++
			dependents[refID] = append(dependents[refID], t.ID())
		}
	}

	// Seed the queue with tables that have no dependencies.
	queue := make([]diagram.TableID, 0, len(tables))
	for _, t := range tables {
		if inDegree[t.ID()] == 0 {
			queue = append(queue, t.ID())
		}
	}

	ordered := make([]diagram.DbTable, 0, len(tables))
	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		ordered = append(ordered, index[id])

		for _, depID := range dependents[id] {
			inDegree[depID]--
			if inDegree[depID] == 0 {
				queue = append(queue, depID)
			}
		}
	}

	if len(ordered) != len(tables) {
		return nil, fmt.Errorf("circular foreign key dependency detected: %w", apperrors.ErrInvalid)
	}

	return ordered, nil
}
