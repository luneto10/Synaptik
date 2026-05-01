package diagram_test

import (
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestNewColumnType_Valid(t *testing.T) {
	tests := []struct {
		raw  string
		want string
	}{
		{raw: "uuid", want: "uuid"},
		{raw: "text", want: "text"},
		{raw: "char", want: "char"},
		{raw: "varchar", want: "varchar"},
		{raw: "int", want: "int"},
		{raw: "bigint", want: "bigint"},
		{raw: "bool", want: "bool"},
		{raw: "boolean", want: "bool"},
		{raw: "timestamp", want: "timestamp"},
		{raw: "json", want: "json"},
		{raw: "jsonb", want: "jsonb"},
		{raw: "decimal", want: "decimal"},
		{raw: "float", want: "float"},
	}
	for _, tt := range tests {
		t.Run(tt.raw, func(t *testing.T) {
			ct, err := diagram.NewColumnType(tt.raw)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if string(ct) != tt.want {
				t.Errorf("got %q, want %q", ct, tt.want)
			}
		})
	}
}

func TestNewColumnType_Invalid(t *testing.T) {
	invalid := []string{"   ", "money", "json[]"}
	for _, raw := range invalid {
		t.Run(raw, func(t *testing.T) {
			_, err := diagram.NewColumnType(raw)
			if err == nil {
				t.Fatalf("expected error for invalid column type %q, got nil", raw)
			}
		})
	}
}

func TestNewRelationshipType_Valid(t *testing.T) {
	tests := []struct {
		raw  string
		want string
	}{
		{raw: "one-to-one", want: "one-to-one"},
		{raw: "one-to-many", want: "one-to-many"},
		{raw: "many-to-many", want: "many-to-many"},
		{raw: " ONE-TO-MANY ", want: "one-to-many"},
	}
	for _, tt := range tests {
		t.Run(tt.raw, func(t *testing.T) {
			rt, err := diagram.NewRelationshipType(tt.raw)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if string(rt) != tt.want {
				t.Errorf("got %q, want %q", rt, tt.want)
			}
		})
	}
}

func TestNewRelationshipType_Invalid(t *testing.T) {
	_, err := diagram.NewRelationshipType("many-to-one")
	if err == nil {
		t.Fatal("expected error for unknown relationship type, got nil")
	}
}

func TestNewDialect_UsesRegistry(t *testing.T) {
	diagram.RegisterDialect("custom")

	dialect, err := diagram.NewDialect(" Custom ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dialect != "custom" {
		t.Fatalf("got %q, want %q", dialect, "custom")
	}
}

func TestNewDialect_Invalid(t *testing.T) {
	_, err := diagram.NewDialect("unknown")
	if err == nil {
		t.Fatal("expected error for unknown dialect, got nil")
	}
}
