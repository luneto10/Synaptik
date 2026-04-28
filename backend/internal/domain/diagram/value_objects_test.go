package diagram_test

import (
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestNewColumnType_Valid(t *testing.T) {
	valid := []string{"uuid", "text", "varchar", "int", "bigint", "boolean", "timestamp", "jsonb", "float"}
	for _, raw := range valid {
		t.Run(raw, func(t *testing.T) {
			ct, err := diagram.NewColumnType(raw)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if string(ct) != raw {
				t.Errorf("got %q, want %q", ct, raw)
			}
		})
	}
}

func TestNewColumnType_Invalid(t *testing.T) {
	_, err := diagram.NewColumnType("notype")
	if err == nil {
		t.Fatal("expected error for unknown column type, got nil")
	}
}

func TestNewRelationshipType_Valid(t *testing.T) {
	valid := []string{"one-to-one", "one-to-many", "many-to-many"}
	for _, raw := range valid {
		t.Run(raw, func(t *testing.T) {
			rt, err := diagram.NewRelationshipType(raw)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if string(rt) != raw {
				t.Errorf("got %q, want %q", rt, raw)
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
