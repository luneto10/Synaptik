package sqlgen_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram/sqlgen"
)

func TestGenerate_EmptyInput(t *testing.T) {
	sql, err := sqlgen.Generate(nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sql != "" {
		t.Errorf("expected empty string, got %q", sql)
	}
}

func TestGenerate_SingleTable(t *testing.T) {
	tables := []diagram.DbTable{
		diagram.NewDbTable("t1", "users", []diagram.DbColumn{
			diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("c2", "email", diagram.ColumnTypeText, false, false, false, true, nil),
		}),
	}

	sql, err := sqlgen.Generate(tables, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(sql, "CREATE TABLE users") {
		t.Errorf("missing CREATE TABLE: %q", sql)
	}
	if !strings.Contains(sql, "PRIMARY KEY") {
		t.Errorf("missing PRIMARY KEY: %q", sql)
	}
	if !strings.Contains(sql, "UNIQUE") {
		t.Errorf("missing UNIQUE: %q", sql)
	}
}

func TestGenerate_FKOrdering(t *testing.T) {
	// posts.user_id references users.id — users must appear first in output.
	ref := diagram.NewColumnReference("t1", "c1")
	tables := []diagram.DbTable{
		// posts is listed first in input but depends on users
		diagram.NewDbTable("t2", "posts", []diagram.DbColumn{
			diagram.NewDbColumn("c3", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("c4", "user_id", diagram.ColumnTypeUUID, false, true, false, false, &ref),
		}),
		diagram.NewDbTable("t1", "users", []diagram.DbColumn{
			diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
		}),
	}

	sql, err := sqlgen.Generate(tables, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	usersPos := strings.Index(sql, "CREATE TABLE users")
	postsPos := strings.Index(sql, "CREATE TABLE posts")
	if usersPos == -1 || postsPos == -1 {
		t.Fatalf("missing table statements: %q", sql)
	}
	if usersPos > postsPos {
		t.Error("users must appear before posts (FK dependency order)")
	}
	if !strings.Contains(sql, "REFERENCES users") {
		t.Errorf("missing inline REFERENCES users: %q", sql)
	}
	if strings.Contains(sql, "ALTER TABLE") {
		t.Errorf("unexpected ALTER TABLE — FKs should be inline: %q", sql)
	}
}

func TestGenerate_CircularDependency(t *testing.T) {
	// a.b_id → b, b.a_id → a: circular
	refAtoB := diagram.NewColumnReference("t2", "c3")
	refBtoA := diagram.NewColumnReference("t1", "c1")
	tables := []diagram.DbTable{
		diagram.NewDbTable("t1", "a", []diagram.DbColumn{
			diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("c2", "b_id", diagram.ColumnTypeUUID, false, true, false, false, &refAtoB),
		}),
		diagram.NewDbTable("t2", "b", []diagram.DbColumn{
			diagram.NewDbColumn("c3", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("c4", "a_id", diagram.ColumnTypeUUID, false, true, false, false, &refBtoA),
		}),
	}

	_, err := sqlgen.Generate(tables, nil)
	if err == nil {
		t.Fatal("expected circular dependency error, got nil")
	}
	if !errors.Is(err, apperrors.ErrInvalid) {
		t.Errorf("error should wrap apperrors.ErrInvalid, got: %v", err)
	}
}

func TestGenerate_ManyToMany(t *testing.T) {
	tables := []diagram.DbTable{
		diagram.NewDbTable("tbl-posts", "posts", []diagram.DbColumn{
			diagram.NewDbColumn("col-post-id", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("col-post-title", "title", diagram.ColumnTypeVarchar, false, false, false, false, nil),
		}),
		diagram.NewDbTable("tbl-tags", "tags", []diagram.DbColumn{
			diagram.NewDbColumn("col-tag-id", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("col-tag-name", "name", diagram.ColumnTypeVarchar, false, false, false, true, nil),
		}),
	}
	rels := []diagram.Relationship{
		diagram.NewRelationship("rel-posts-tags", "col-post-id", "col-tag-id", diagram.RelationshipManyToMany),
	}

	sql, err := sqlgen.Generate(tables, rels)
	if err != nil {
		t.Fatalf("Generate failed: %v", err)
	}
	if !strings.Contains(sql, "CREATE TABLE post_tag") {
		t.Error("missing junction table post_tag")
	}
	if !strings.Contains(sql, "PRIMARY KEY (post_id, tag_id)") {
		t.Error("missing composite primary key on post_tag")
	}
	if !strings.Contains(sql, "post_id uuid NOT NULL REFERENCES posts (id)") {
		t.Errorf("missing inline FK for post_id: %s", sql)
	}
	if !strings.Contains(sql, "tag_id uuid NOT NULL REFERENCES tags (id)") {
		t.Errorf("missing inline FK for tag_id: %s", sql)
	}
	if strings.Contains(sql, "ALTER TABLE") {
		t.Errorf("unexpected ALTER TABLE — FKs should be inline: %s", sql)
	}
}
