package diagramapp_test

import (
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

	sql, err := uc.Execute(validRequest)
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

	_, err := uc.Execute(req)
	if err == nil {
		t.Fatal("expected error for invalid column type, got nil")
	}
}

func TestConvertToSQLUseCase_Execute_InvalidRelationshipType(t *testing.T) {
	uc := diagramapp.NewConvertToSQLUseCase()

	req := diagramapp.DiagramRequest{
		Tables:        []diagramapp.DbTableRequest{},
		Relationships: []diagramapp.RelationshipRequest{
			{ID: "r1", SourceColumnID: "c1", TargetColumnID: "c2", RelationshipType: "bad-type"},
		},
	}

	_, err := uc.Execute(req)
	if err == nil {
		t.Fatal("expected error for invalid relationship type, got nil")
	}
}

func TestConvertToSQLUseCase_Execute_SaveFixtureOutput(t *testing.T) {
	data, err := os.ReadFile("../../domain/diagram/sqlgen/fixtures/postgres_request.json")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	var req diagramapp.DiagramRequest
	if err := json.Unmarshal(data, &req); err != nil {
		t.Fatalf("unmarshal fixture: %v", err)
	}

	sql, err := diagramapp.NewConvertToSQLUseCase().Execute(req)
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}

	if err := os.WriteFile("../../domain/diagram/sqlgen/fixtures/output.sql", []byte(sql), 0644); err != nil {
		t.Fatalf("write output: %v", err)
	}

	t.Logf("generated SQL written to fixtures/output.sql:\n%s", sql)
}

func TestConvertToSQLUseCase_Execute_ManyToManyFixture(t *testing.T) {
	data, err := os.ReadFile("../../domain/diagram/sqlgen/fixtures/postgres_request.json")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	var req diagramapp.DiagramRequest
	if err := json.Unmarshal(data, &req); err != nil {
		t.Fatalf("unmarshal fixture: %v", err)
	}

	uc := diagramapp.NewConvertToSQLUseCase()
	sql, err := uc.Execute(req)
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}

	checks := []struct {
		desc string
		want string
	}{
		{"categories table created", "CREATE TABLE categories"},
		{"products table created", "CREATE TABLE products"},
		{"orders table created", "CREATE TABLE orders"},
		{"junction table created", "CREATE TABLE order_product"},
		{"composite PK on junction", "PRIMARY KEY (order_id, product_id)"},
		{"inline FK to orders", "order_id uuid NOT NULL REFERENCES orders (id)"},
		{"inline FK to products", "product_id uuid NOT NULL REFERENCES products (id)"},
		{"products inline FK to categories", "category_id uuid NOT NULL REFERENCES categories (id)"},
	}
	for _, ch := range checks {
		if !strings.Contains(sql, ch.want) {
			t.Errorf("%s: missing %q in output", ch.desc, ch.want)
		}
	}
}

func TestConvertToSQLUseCase_Execute_MySQLFixture(t *testing.T) {
	data, err := os.ReadFile("../../domain/diagram/sqlgen/fixtures/mysql_request.json")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	var req diagramapp.DiagramRequest
	if err := json.Unmarshal(data, &req); err != nil {
		t.Fatalf("unmarshal fixture: %v", err)
	}

	sql, err := diagramapp.NewConvertToSQLUseCase().Execute(req)
	if err != nil {
		t.Fatalf("Execute failed: %v", err)
	}

	checks := []struct {
		desc string
		want string
	}{
		{"users table created", "CREATE TABLE users"},
		{"auto increment pk", "id int AUTO_INCREMENT PRIMARY KEY"},
		{"bool mapped to tinyint", "is_active tinyint(1) NOT NULL"},
		{"varchar length emitted", "email varchar(180) NOT NULL UNIQUE"},
		{"decimal precision emitted", "credit_limit decimal(12, 2) NOT NULL"},
		{"orders fk emitted", "user_id int NOT NULL REFERENCES users (id)"},
	}

	for _, ch := range checks {
		if !strings.Contains(sql, ch.want) {
			t.Errorf("%s: missing %q in output", ch.desc, ch.want)
		}
	}
}

func TestConvertToSQLUseCase_Execute_MySQLDialect(t *testing.T) {
	uc := diagramapp.NewConvertToSQLUseCase()

	req := diagramapp.DiagramRequest{
		Dialect: "mysql",
		Tables: []diagramapp.DbTableRequest{
			{
				ID:   "t1",
				Name: "users",
				Columns: []diagramapp.DbColumnRequest{
					{
						ID:              "c1",
						Name:            "id",
						Type:            "int",
						IsPrimaryKey:    true,
						IsAutoIncrement: true,
					},
					{
						ID:          "c2",
						Name:        "email",
						Type:        "varchar",
						TypeOptions: diagramapp.ColumnTypeOptionsRequest{Length: intPtr(120)},
						IsNullable:  false,
						IsUnique:    true,
					},
					{
						ID:          "c3",
						Name:        "is_admin",
						Type:        "bool",
						IsNullable:  false,
					},
					{
						ID:          "c4",
						Name:        "credit_limit",
						Type:        "decimal",
						TypeOptions: diagramapp.ColumnTypeOptionsRequest{Precision: intPtr(12), Scale: intPtr(2)},
						IsNullable:  false,
					},
				},
			},
		},
		Relationships: []diagramapp.RelationshipRequest{},
	}

	sql, err := uc.Execute(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	checks := []string{
		"id int AUTO_INCREMENT PRIMARY KEY",
		"email varchar(120) NOT NULL UNIQUE",
		"is_admin tinyint(1) NOT NULL",
		"credit_limit decimal(12, 2) NOT NULL",
	}

	for _, want := range checks {
		if !strings.Contains(sql, want) {
			t.Errorf("missing %q in output: %s", want, sql)
		}
	}
}

func intPtr(value int) *int {
	return &value
}
