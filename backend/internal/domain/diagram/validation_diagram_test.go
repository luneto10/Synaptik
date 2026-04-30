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
