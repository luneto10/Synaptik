package sqlgen

import (
	"errors"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestSortByDependency(t *testing.T) {
	ref := func(tableID, colID string) *diagram.ColumnReference {
		r := diagram.NewColumnReference(diagram.TableID(tableID), diagram.ColumnID(colID))
		return &r
	}

	t.Run("empty input: returns empty slice", func(t *testing.T) {
		got, err := sortByDependency(nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(got) != 0 {
			t.Errorf("expected empty result, got %d tables", len(got))
		}
	})

	t.Run("single table with no deps", func(t *testing.T) {
		tables := []diagram.DbTable{
			diagram.NewDbTable("t1", "users", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			}),
		}
		got, err := sortByDependency(tables)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(got) != 1 || got[0].Name() != "users" {
			t.Errorf("expected [users], got %v", tableNames(got))
		}
	})

	t.Run("FK dependency: referenced table placed first", func(t *testing.T) {
		tables := []diagram.DbTable{
			diagram.NewDbTable("t2", "posts", []diagram.DbColumn{
				diagram.NewDbColumn("c3", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c4", "user_id", diagram.ColumnTypeUUID, false, true, false, false, ref("t1", "c1")),
			}),
			diagram.NewDbTable("t1", "users", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			}),
		}
		got, err := sortByDependency(tables)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		names := tableNames(got)
		if names[0] != "users" || names[1] != "posts" {
			t.Errorf("expected [users posts], got %v", names)
		}
	})

	t.Run("self-referencing FK: no cycle error", func(t *testing.T) {
		selfRef := diagram.NewColumnReference("t1", "c1")
		tables := []diagram.DbTable{
			diagram.NewDbTable("t1", "employees", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c2", "manager_id", diagram.ColumnTypeUUID, false, true, true, false, &selfRef),
			}),
		}
		_, err := sortByDependency(tables)
		if err != nil {
			t.Errorf("self-reference should not produce a cycle error: %v", err)
		}
	})

	t.Run("circular dependency: error wraps ErrInvalid", func(t *testing.T) {
		tables := []diagram.DbTable{
			diagram.NewDbTable("t1", "a", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c2", "b_id", diagram.ColumnTypeUUID, false, true, false, false, ref("t2", "c3")),
			}),
			diagram.NewDbTable("t2", "b", []diagram.DbColumn{
				diagram.NewDbColumn("c3", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c4", "a_id", diagram.ColumnTypeUUID, false, true, false, false, ref("t1", "c1")),
			}),
		}
		_, err := sortByDependency(tables)
		if err == nil {
			t.Fatal("expected error for circular dependency, got nil")
		}
		if !errors.Is(err, apperrors.ErrInvalid) {
			t.Errorf("error should wrap apperrors.ErrInvalid, got: %v", err)
		}
	})

	t.Run("diamond dependency: shared dep resolved before all dependents", func(t *testing.T) {
		// D depends on A and B; A and B both depend on C.
		tables := []diagram.DbTable{
			diagram.NewDbTable("tD", "d", []diagram.DbColumn{
				diagram.NewDbColumn("cd1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("cd2", "a_id", diagram.ColumnTypeUUID, false, true, false, false, ref("tA", "ca1")),
				diagram.NewDbColumn("cd3", "b_id", diagram.ColumnTypeUUID, false, true, false, false, ref("tB", "cb1")),
			}),
			diagram.NewDbTable("tA", "a", []diagram.DbColumn{
				diagram.NewDbColumn("ca1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("ca2", "c_id", diagram.ColumnTypeUUID, false, true, false, false, ref("tC", "cc1")),
			}),
			diagram.NewDbTable("tB", "b", []diagram.DbColumn{
				diagram.NewDbColumn("cb1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("cb2", "c_id", diagram.ColumnTypeUUID, false, true, false, false, ref("tC", "cc1")),
			}),
			diagram.NewDbTable("tC", "c", []diagram.DbColumn{
				diagram.NewDbColumn("cc1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			}),
		}
		got, err := sortByDependency(tables)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(got) != 4 {
			t.Fatalf("expected 4 tables, got %d", len(got))
		}
		pos := make(map[string]int, 4)
		for i, tab := range got {
			pos[tab.Name()] = i
		}
		if pos["c"] >= pos["a"] {
			t.Errorf("c must come before a: c=%d a=%d", pos["c"], pos["a"])
		}
		if pos["c"] >= pos["b"] {
			t.Errorf("c must come before b: c=%d b=%d", pos["c"], pos["b"])
		}
		if pos["a"] >= pos["d"] {
			t.Errorf("a must come before d: a=%d d=%d", pos["a"], pos["d"])
		}
		if pos["b"] >= pos["d"] {
			t.Errorf("b must come before d: b=%d d=%d", pos["b"], pos["d"])
		}
	})

	t.Run("duplicate FK to same table: counted once in inDegree", func(t *testing.T) {
		// posts has two columns referencing users — inDegree should be 1, not 2.
		tables := []diagram.DbTable{
			diagram.NewDbTable("t2", "posts", []diagram.DbColumn{
				diagram.NewDbColumn("c3", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c4", "author_id", diagram.ColumnTypeUUID, false, true, false, false, ref("t1", "c1")),
				diagram.NewDbColumn("c5", "editor_id", diagram.ColumnTypeUUID, false, true, true, false, ref("t1", "c1")),
			}),
			diagram.NewDbTable("t1", "users", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			}),
		}
		got, err := sortByDependency(tables)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got[0].Name() != "users" {
			t.Errorf("users must come first, got: %v", tableNames(got))
		}
	})
}

func tableNames(tables []diagram.DbTable) []string {
	names := make([]string, len(tables))
	for i, t := range tables {
		names[i] = t.Name()
	}
	return names
}
