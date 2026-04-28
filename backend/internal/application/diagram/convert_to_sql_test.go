package diagramapp_test

import (
	"context"
	"encoding/json"
	"os"
	"strings"
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
	if !strings.Contains(sql, "CREATE TABLE users") {
		t.Errorf("expected SQL to contain CREATE TABLE users, got: %q", sql)
	}
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

// TestConvertToSQLUseCase_Execute_ManyToManyFixture loads the shared request.json
// fixture and verifies the full many-to-many DDL output end-to-end.
func TestConvertToSQLUseCase_Execute_ManyToManyFixture(t *testing.T) {
	data, err := os.ReadFile("../../domain/diagram/sqlgen/fixtures/request.json")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	var req diagramapp.DiagramRequest
	if err := json.Unmarshal(data, &req); err != nil {
		t.Fatalf("unmarshal fixture: %v", err)
	}

	uc := diagramapp.NewConvertToSQLUseCase()
	sql, err := uc.Execute(context.Background(), req)
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}

	checks := []struct {
		desc string
		want string
	}{
		{"posts table created", "CREATE TABLE posts"},
		{"tags table created", "CREATE TABLE tags"},
		{"junction table created", "CREATE TABLE post_tag"},
		{"composite PK on junction", "PRIMARY KEY (post_id, tag_id)"},
		{"FK from junction to posts", "REFERENCES posts (id)"},
		{"FK from junction to tags", "REFERENCES tags (id)"},
	}
	for _, ch := range checks {
		if !strings.Contains(sql, ch.want) {
			t.Errorf("%s: missing %q in output", ch.desc, ch.want)
		}
	}
}
