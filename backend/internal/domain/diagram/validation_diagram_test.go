package diagram_test

import (
	"errors"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestValidateDiagram_RelationshipUnknownSourceColumn(t *testing.T) {
	tbl := diagram.NewDbTable("t1", "users", []diagram.DbColumn{
		newDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})
	rel := diagram.NewRelationship("r1", "missing", "c1", diagram.RelationshipOneToMany)
	err := diagram.ValidateDiagram([]diagram.DbTable{tbl}, []diagram.Relationship{rel})
	if err == nil || !errors.Is(err, apperrors.ErrInvalid) {
		t.Fatalf("want ErrInvalid, got %v", err)
	}
}

func TestValidateDiagram_FKUnknownTable(t *testing.T) {
	ref := diagram.NewColumnReference("ghost", "c2")
	col := newDbColumn("c1", "user_id", diagram.ColumnTypeUUID, false, true, false, false, &ref)
	tbl := diagram.NewDbTable("t1", "posts", []diagram.DbColumn{col})
	err := diagram.ValidateDiagram([]diagram.DbTable{tbl}, nil)
	if err == nil || !errors.Is(err, apperrors.ErrInvalid) {
		t.Fatalf("want ErrInvalid, got %v", err)
	}
}

func TestValidateDiagram_FKUnknownColumn(t *testing.T) {
	ref := diagram.NewColumnReference("t2", "missing-col")
	col := newDbColumn("c1", "user_id", diagram.ColumnTypeUUID, false, true, false, false, &ref)
	users := diagram.NewDbTable("t2", "users", []diagram.DbColumn{
		newDbColumn("c2", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})
	posts := diagram.NewDbTable("t1", "posts", []diagram.DbColumn{col})
	err := diagram.ValidateDiagram([]diagram.DbTable{posts, users}, nil)
	if err == nil || !errors.Is(err, apperrors.ErrInvalid) {
		t.Fatalf("want ErrInvalid, got %v", err)
	}
}

func TestValidateDiagram_FKColumnNotInReferencedTable(t *testing.T) {
	ref := diagram.NewColumnReference("t2", "c3")
	col := newDbColumn("c1", "user_id", diagram.ColumnTypeUUID, false, true, false, false, &ref)
	users := diagram.NewDbTable("t2", "users", []diagram.DbColumn{
		newDbColumn("c2", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})
	teams := diagram.NewDbTable("t3", "teams", []diagram.DbColumn{
		newDbColumn("c3", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})
	posts := diagram.NewDbTable("t1", "posts", []diagram.DbColumn{col})

	err := diagram.ValidateDiagram([]diagram.DbTable{posts, users, teams}, nil)
	if err == nil || !errors.Is(err, apperrors.ErrInvalid) {
		t.Fatalf("want ErrInvalid, got %v", err)
	}
}

func TestValidateDiagram_DuplicateTableID(t *testing.T) {
	t1 := diagram.NewDbTable("t1", "users", []diagram.DbColumn{
		newDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})
	t2 := diagram.NewDbTable("t1", "teams", []diagram.DbColumn{
		newDbColumn("c2", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})

	err := diagram.ValidateDiagram([]diagram.DbTable{t1, t2}, nil)
	if err == nil || !errors.Is(err, apperrors.ErrInvalid) {
		t.Fatalf("want ErrInvalid, got %v", err)
	}
}

func TestValidateDiagram_DuplicateTableName(t *testing.T) {
	t1 := diagram.NewDbTable("t1", "users", []diagram.DbColumn{
		newDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})
	t2 := diagram.NewDbTable("t2", "users", []diagram.DbColumn{
		newDbColumn("c2", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})

	err := diagram.ValidateDiagram([]diagram.DbTable{t1, t2}, nil)
	if err == nil || !errors.Is(err, apperrors.ErrInvalid) {
		t.Fatalf("want ErrInvalid, got %v", err)
	}
}

func TestValidateDiagram_DuplicateColumnID(t *testing.T) {
	t1 := diagram.NewDbTable("t1", "users", []diagram.DbColumn{
		newDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})
	t2 := diagram.NewDbTable("t2", "teams", []diagram.DbColumn{
		newDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	})

	err := diagram.ValidateDiagram([]diagram.DbTable{t1, t2}, nil)
	if err == nil || !errors.Is(err, apperrors.ErrInvalid) {
		t.Fatalf("want ErrInvalid, got %v", err)
	}
}
