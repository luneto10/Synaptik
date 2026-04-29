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

func TestConvertToSQLUseCase_Execute_PostgresGeneratedUUID(t *testing.T) {
	uc := diagramapp.NewConvertToSQLUseCase()

	req := diagramapp.DiagramRequest{
		Dialect: "postgres",
		Tables: []diagramapp.DbTableRequest{
			{
				ID:   "t1",
				Name: "users",
				Columns: []diagramapp.DbColumnRequest{
					{
						ID:              "c1",
						Name:            "id",
						Type:            "uuid",
						IsPrimaryKey:    true,
						IsGeneratedUUID: true,
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
	if !strings.Contains(sql, "id uuid DEFAULT gen_random_uuid() PRIMARY KEY") {
		t.Fatalf("missing postgres generated uuid default: %s", sql)
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
		Tables: []diagramapp.DbTableRequest{},
		Relationships: []diagramapp.RelationshipRequest{
			{ID: "r1", SourceColumnID: "c1", TargetColumnID: "c2", RelationshipType: "bad-type"},
		},
	}

	_, err := uc.Execute(req)
	if err == nil {
		t.Fatal("expected error for invalid relationship type, got nil")
	}
}

func TestConvertToSQLUseCase_Execute_SavePostgresFixtureOutput(t *testing.T) {
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

	if err := os.WriteFile("../../domain/diagram/sqlgen/fixtures/postgres_output.sql", []byte(sql), 0644); err != nil {
		t.Fatalf("write output: %v", err)
	}

	t.Logf("generated SQL written to fixtures/postgres_output.sql:\n%s", sql)
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
		{"categories table created", "CREATE TABLE categories"},
		{"products table created", "CREATE TABLE products"},
		{"orders table created", "CREATE TABLE orders"},
		{"generated uuid pk", "id char(36) DEFAULT (UUID()) PRIMARY KEY"},
		{"varchar length emitted", "name varchar(255) NOT NULL"},
		{"decimal precision emitted", "price decimal(10, 2) NOT NULL"},
		{"products fk emitted", "category_id char(36) NOT NULL REFERENCES categories (id)"},
		{"junction table created", "CREATE TABLE order_product"},
		{"junction fk to orders", "order_id char(36) NOT NULL REFERENCES orders (id)"},
		{"junction fk to products", "product_id char(36) NOT NULL REFERENCES products (id)"},
	}

	for _, ch := range checks {
		if !strings.Contains(sql, ch.want) {
			t.Errorf("%s: missing %q in output", ch.desc, ch.want)
		}
	}
}

func TestConvertToSQLUseCase_Execute_SaveMySQLFixtureOutput(t *testing.T) {
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

	if err := os.WriteFile("../../domain/diagram/sqlgen/fixtures/output.sql", []byte(sql), 0644); err != nil {
		t.Fatalf("write output: %v", err)
	}

	t.Logf("generated SQL written to fixtures/output.sql:\n%s", sql)
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
						ID:         "c3",
						Name:       "is_admin",
						Type:       "bool",
						IsNullable: false,
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

func TestConvertToSQLUseCase_Execute_MySQLGeneratedUUID(t *testing.T) {
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
						Name:            "public_id",
						Type:            "uuid",
						IsNullable:      false,
						IsUnique:        true,
						IsGeneratedUUID: true,
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
	if !strings.Contains(sql, "public_id char(36) DEFAULT (UUID()) NOT NULL UNIQUE") {
		t.Fatalf("missing mysql generated uuid default: %s", sql)
	}
}

func TestConvertToSQLUseCase_Execute_CharType(t *testing.T) {
	uc := diagramapp.NewConvertToSQLUseCase()

	req := diagramapp.DiagramRequest{
		Dialect: "postgres",
		Tables: []diagramapp.DbTableRequest{
			{
				ID:   "t1",
				Name: "countries",
				Columns: []diagramapp.DbColumnRequest{
					{
						ID:   "c1",
						Name: "code",
						Type: "char",
						TypeOptions: diagramapp.ColumnTypeOptionsRequest{
							Length: intPtr(2),
						},
						IsNullable: false,
						IsUnique:   true,
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
	if !strings.Contains(sql, "code char(2) NOT NULL UNIQUE") {
		t.Fatalf("missing char type output: %s", sql)
	}
}

//go:fix inline
func intPtr(value int) *int {
	return new(value)
}
