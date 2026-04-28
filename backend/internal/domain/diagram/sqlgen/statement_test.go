package sqlgen_test

import (
	"strings"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram/sqlgen"
)

func TestColumnDef(t *testing.T) {
	tests := []struct {
		name      string
		colName   string
		dataType  string
		modifiers []string
		wantParts []string
	}{
		{
			name:      "primary key and not null",
			colName:   "id",
			dataType:  "uuid",
			modifiers: []string{sqlgen.PrimaryKey(), sqlgen.NotNull()},
			wantParts: []string{"id", "uuid", "PRIMARY KEY", "NOT NULL"},
		},
		{
			name:      "no modifiers",
			colName:   "bio",
			dataType:  "text",
			wantParts: []string{"bio", "text"},
		},
		{
			name:      "not null and unique",
			colName:   "email",
			dataType:  "text",
			modifiers: []string{sqlgen.NotNull(), sqlgen.Unique()},
			wantParts: []string{"email", "text", "NOT NULL", "UNIQUE"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sqlgen.ColumnDef(tt.colName, tt.dataType, tt.modifiers...)
			for _, part := range tt.wantParts {
				if !strings.Contains(got, part) {
					t.Errorf("missing %q in output: %q", part, got)
				}
			}
		})
	}
}

func TestCreateTable(t *testing.T) {
	tests := []struct {
		name      string
		tableName string
		cols      []string
		wantParts []string
	}{
		{
			name:      "two columns",
			tableName: "users",
			cols: []string{
				sqlgen.ColumnDef("id", "uuid", sqlgen.PrimaryKey()),
				sqlgen.ColumnDef("email", "text", sqlgen.NotNull(), sqlgen.Unique()),
			},
			wantParts: []string{"CREATE TABLE users", "id", "email"},
		},
		{
			name:      "single column",
			tableName: "orders",
			cols:      []string{sqlgen.ColumnDef("id", "uuid")},
			wantParts: []string{"CREATE TABLE orders", "id"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sqlgen.CreateTable(tt.tableName, tt.cols)
			if !strings.HasPrefix(got, "CREATE TABLE "+tt.tableName) {
				t.Errorf("expected prefix 'CREATE TABLE %s', got: %q", tt.tableName, got)
			}
			for _, part := range tt.wantParts {
				if !strings.Contains(got, part) {
					t.Errorf("missing %q in output: %q", part, got)
				}
			}
		})
	}
}

func TestAddForeignKey(t *testing.T) {
	tests := []struct {
		name            string
		onTable         string
		constraintName  string
		column          string
		referencesTable string
		referencesCol   string
		wantParts       []string
	}{
		{
			name:            "standard FK",
			onTable:         "posts",
			constraintName:  "posts_user_id",
			column:          "user_id",
			referencesTable: "users",
			referencesCol:   "id",
			wantParts:       []string{"ALTER TABLE posts", "fk_posts_user_id", "FOREIGN KEY (user_id)", "REFERENCES users (id)"},
		},
		{
			name:            "junction table FK",
			onTable:         "post_tag",
			constraintName:  "post_tag_post_id",
			column:          "post_id",
			referencesTable: "posts",
			referencesCol:   "id",
			wantParts:       []string{"ALTER TABLE post_tag", "fk_post_tag_post_id", "REFERENCES posts (id)"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sqlgen.AddForeignKey(tt.onTable, tt.constraintName, tt.column, tt.referencesTable, tt.referencesCol)
			for _, part := range tt.wantParts {
				if !strings.Contains(got, part) {
					t.Errorf("missing %q in output: %q", part, got)
				}
			}
		})
	}
}

func TestCompositePrimaryKey(t *testing.T) {
	tests := []struct {
		name    string
		columns []string
		want    string
	}{
		{
			name:    "two columns",
			columns: []string{"post_id", "tag_id"},
			want:    "PRIMARY KEY (post_id, tag_id)",
		},
		{
			name:    "three columns",
			columns: []string{"a", "b", "c"},
			want:    "PRIMARY KEY (a, b, c)",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sqlgen.CompositePrimaryKey(tt.columns...)
			if !strings.Contains(got, tt.want) {
				t.Errorf("got %q, want to contain %q", got, tt.want)
			}
		})
	}
}
