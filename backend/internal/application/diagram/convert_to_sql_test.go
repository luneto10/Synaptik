package diagramapp_test

import (
	"context"
	"testing"

	diagramapp "github.com/luneto10/synaptik/backend/internal/application/diagram"
)

var validRequest = diagramapp.DiagramRequest{
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

func TestConvertToSQLUseCase_Execute_ValidRequest(t *testing.T) {
	uc := diagramapp.NewConvertToSQLUseCase()

	sql, err := uc.Execute(context.Background(), validRequest)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	_ = sql
}

func TestConvertToSQLUseCase_Execute_InvalidColumnType(t *testing.T) {
	uc := diagramapp.NewConvertToSQLUseCase()

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

	_, err := uc.Execute(context.Background(), req)
	if err == nil {
		t.Fatal("expected error for invalid column type, got nil")
	}
}

func TestConvertToSQLUseCase_Execute_InvalidRelationshipType(t *testing.T) {
	uc := diagramapp.NewConvertToSQLUseCase()

	req := diagramapp.DiagramRequest{
		Tables: []diagramapp.DbTableRequest{},
		Relationships: []diagramapp.RelationshipRequest{
			{ID: "r1", SourceColumnID: "c1", TargetColumnID: "c2", RelationshipType: "bad-type"},
		},
	}

	_, err := uc.Execute(context.Background(), req)
	if err == nil {
		t.Fatal("expected error for invalid relationship type, got nil")
	}
}
