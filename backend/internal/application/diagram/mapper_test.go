package diagramapp_test

import (
	"testing"

	diagramapp "github.com/luneto10/synaptik/backend/internal/application/diagram"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestToDomainDiagram_ValidInput(t *testing.T) {
	req := diagramapp.DiagramRequest{
		Tables: []diagramapp.DbTableRequest{
			{
				ID:   "t1",
				Name: "users",
				Columns: []diagramapp.DbColumnRequest{
					{ID: "c1", Name: "id", Type: "uuid", IsPrimaryKey: true},
					{ID: "c2", Name: "email", Type: "text", IsUnique: true},
				},
			},
		},
		Relationships: []diagramapp.RelationshipRequest{},
	}

	tables, rels, err := diagramapp.ToDomainDiagram(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tables) != 1 {
		t.Fatalf("tables len = %d, want 1", len(tables))
	}
	if tables[0].Name() != "users" {
		t.Errorf("table name = %q, want %q", tables[0].Name(), "users")
	}
	if len(tables[0].Columns()) != 2 {
		t.Errorf("columns len = %d, want 2", len(tables[0].Columns()))
	}
	if len(rels) != 0 {
		t.Errorf("rels len = %d, want 0", len(rels))
	}
}

func TestToDomainDiagram_InvalidColumnType(t *testing.T) {
	req := diagramapp.DiagramRequest{
		Tables: []diagramapp.DbTableRequest{
			{
				ID:   "t1",
				Name: "users",
				Columns: []diagramapp.DbColumnRequest{
					{ID: "c1", Name: "id", Type: "badtype"},
				},
			},
		},
		Relationships: []diagramapp.RelationshipRequest{},
	}

	_, _, err := diagramapp.ToDomainDiagram(req)
	if err == nil {
		t.Fatal("expected error for invalid column type, got nil")
	}
}

func TestToDomainDiagram_InvalidRelationshipType(t *testing.T) {
	req := diagramapp.DiagramRequest{
		Tables: []diagramapp.DbTableRequest{},
		Relationships: []diagramapp.RelationshipRequest{
			{ID: "r1", SourceColumnID: "c1", TargetColumnID: "c2", RelationshipType: "bad-type"},
		},
	}

	_, _, err := diagramapp.ToDomainDiagram(req)
	if err == nil {
		t.Fatal("expected error for invalid relationship type, got nil")
	}
}

func TestToDomainDiagram_FKReference(t *testing.T) {
	req := diagramapp.DiagramRequest{
		Tables: []diagramapp.DbTableRequest{
			{
				ID:   "t1",
				Name: "posts",
				Columns: []diagramapp.DbColumnRequest{
					{
						ID:           "c1",
						Name:         "user_id",
						Type:         "uuid",
						IsForeignKey: true,
						References:   &diagramapp.ColumnReferenceRequest{TableID: "t2", ColumnID: "c2"},
					},
				},
			},
		},
		Relationships: []diagramapp.RelationshipRequest{
			{ID: "r1", SourceColumnID: "c1", TargetColumnID: "c2", RelationshipType: "one-to-many"},
		},
	}

	tables, rels, err := diagramapp.ToDomainDiagram(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	col := tables[0].Columns()[0]
	if col.References() == nil {
		t.Fatal("expected FK reference, got nil")
	}
	if col.References().TableID() != diagram.TableID("t2") {
		t.Errorf("reference tableID = %q, want %q", col.References().TableID(), "t2")
	}
	if len(rels) != 1 {
		t.Errorf("rels len = %d, want 1", len(rels))
	}
}
