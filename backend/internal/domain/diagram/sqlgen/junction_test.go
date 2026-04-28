package sqlgen

import (
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestResolveManyToMany(t *testing.T) {
	posts := diagram.NewDbTable("t-posts", "posts", []diagram.DbColumn{
		diagram.NewDbColumn("c-post-id", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})
	tags := diagram.NewDbTable("t-tags", "tags", []diagram.DbColumn{
		diagram.NewDbColumn("c-tag-id", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})
	users := diagram.NewDbTable("t-users", "users", []diagram.DbColumn{
		diagram.NewDbColumn("c-user-id", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})

	t.Run("no relationships: returns copy of input", func(t *testing.T) {
		tables := []diagram.DbTable{posts, tags}
		got := resolveManyToMany(tables, nil, buildColumnIndex(tables))
		if len(got) != 2 {
			t.Errorf("expected 2 tables, got %d", len(got))
		}
	})

	t.Run("one-to-many relationship: no junction created", func(t *testing.T) {
		tables := []diagram.DbTable{posts, tags}
		rels := []diagram.Relationship{
			diagram.NewRelationship("r1", "c-post-id", "c-tag-id", diagram.RelationshipOneToMany),
		}
		got := resolveManyToMany(tables, rels, buildColumnIndex(tables))
		if len(got) != 2 {
			t.Errorf("expected 2 tables, got %d", len(got))
		}
	})

	t.Run("many-to-many: junction table created with correct name", func(t *testing.T) {
		tables := []diagram.DbTable{posts, tags}
		rels := []diagram.Relationship{
			diagram.NewRelationship("r1", "c-post-id", "c-tag-id", diagram.RelationshipManyToMany),
		}
		got := resolveManyToMany(tables, rels, buildColumnIndex(tables))
		if len(got) != 3 {
			t.Fatalf("expected 3 tables (post, tag, junction), got %d", len(got))
		}
		junc := findJunction(got)
		if junc == nil {
			t.Fatal("junction table not found")
		}
		if junc.Name() != "post_tag" {
			t.Errorf("junction name = %q, want post_tag", junc.Name())
		}
		if len(junc.Columns()) != 2 {
			t.Errorf("junction columns = %d, want 2", len(junc.Columns()))
		}
	})

	t.Run("duplicate M2M relationship: only one junction created", func(t *testing.T) {
		tables := []diagram.DbTable{posts, tags}
		rels := []diagram.Relationship{
			diagram.NewRelationship("r1", "c-post-id", "c-tag-id", diagram.RelationshipManyToMany),
			diagram.NewRelationship("r2", "c-post-id", "c-tag-id", diagram.RelationshipManyToMany),
		}
		got := resolveManyToMany(tables, rels, buildColumnIndex(tables))
		if len(got) != 3 {
			t.Errorf("expected 3 tables (no duplicate junction), got %d", len(got))
		}
	})

	t.Run("self-referencing M2M: junction uses source_id / target_id columns", func(t *testing.T) {
		tables := []diagram.DbTable{users}
		rels := []diagram.Relationship{
			diagram.NewRelationship("r1", "c-user-id", "c-user-id", diagram.RelationshipManyToMany),
		}
		got := resolveManyToMany(tables, rels, buildColumnIndex(tables))
		if len(got) != 2 {
			t.Fatalf("expected 2 tables (user + self-junction), got %d", len(got))
		}
		junc := findJunction(got)
		if junc == nil {
			t.Fatal("junction table not found")
		}
		colNames := columnNames(junc.Columns())
		if !colNames["source_id"] || !colNames["target_id"] {
			t.Errorf("self-referencing junction should have source_id and target_id, got: %v", colNames)
		}
	})

	t.Run("pre-existing junction table is not duplicated", func(t *testing.T) {
		existing := diagram.NewJunctionTable("post_tag", "post_tag", []diagram.DbColumn{
			diagram.NewDbColumn("j1", "post_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("j2", "tag_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
		})
		tables := []diagram.DbTable{posts, tags, existing}
		rels := []diagram.Relationship{
			diagram.NewRelationship("r1", "c-post-id", "c-tag-id", diagram.RelationshipManyToMany),
		}
		got := resolveManyToMany(tables, rels, buildColumnIndex(tables))
		junctionCount := 0
		for _, tab := range got {
			if tab.IsJunction() {
				junctionCount++
			}
		}
		if junctionCount != 1 {
			t.Errorf("expected 1 junction table, got %d", junctionCount)
		}
	})
}

func findJunction(tables []diagram.DbTable) *diagram.DbTable {
	for i := range tables {
		if tables[i].IsJunction() {
			return &tables[i]
		}
	}
	return nil
}

func columnNames(cols []diagram.DbColumn) map[string]bool {
	names := make(map[string]bool, len(cols))
	for _, c := range cols {
		names[c.Name()] = true
	}
	return names
}
