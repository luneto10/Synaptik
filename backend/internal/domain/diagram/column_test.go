package diagram_test

import (
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestNewDbColumn_Getters(t *testing.T) {
	ref := diagram.NewColumnReference("t2", "c2")
	col := diagram.NewDbColumn("c1", "email", diagram.ColumnTypeText, false, false, true, true, &ref)

	if col.ID() != "c1" {
		t.Errorf("ID = %q, want %q", col.ID(), "c1")
	}
	if col.Name() != "email" {
		t.Errorf("Name = %q, want %q", col.Name(), "email")
	}
	if col.Type() != diagram.ColumnTypeText {
		t.Errorf("Type = %q, want %q", col.Type(), diagram.ColumnTypeText)
	}
	if col.IsPrimaryKey() {
		t.Error("IsPrimaryKey = true, want false")
	}
	if col.IsForeignKey() {
		t.Error("IsForeignKey = true, want false")
	}
	if !col.IsNullable() {
		t.Error("IsNullable = false, want true")
	}
	if !col.IsUnique() {
		t.Error("IsUnique = false, want true")
	}
	if col.References() == nil {
		t.Fatal("References = nil, want non-nil")
	}
	if col.References().TableID() != "t2" {
		t.Errorf("References.TableID = %q, want %q", col.References().TableID(), "t2")
	}
}

func TestNewDbColumn_NoReference(t *testing.T) {
	col := diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil)
	if col.References() != nil {
		t.Errorf("References = %v, want nil", col.References())
	}
}

func TestNewDbColumn_Flags(t *testing.T) {
	tests := []struct {
		name         string
		isPrimaryKey bool
		isForeignKey bool
		isNullable   bool
		isUnique     bool
	}{
		{"all false", false, false, false, false},
		{"primary key only", true, false, false, false},
		{"foreign key nullable", false, true, true, false},
		{"unique not-null", false, false, false, true},
		{"nullable only", false, false, true, false},
		{"PK and FK", true, true, false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			col := diagram.NewDbColumn("c1", "col", diagram.ColumnTypeText,
				tt.isPrimaryKey, tt.isForeignKey, tt.isNullable, tt.isUnique, nil)
			if col.IsPrimaryKey() != tt.isPrimaryKey {
				t.Errorf("IsPrimaryKey = %v, want %v", col.IsPrimaryKey(), tt.isPrimaryKey)
			}
			if col.IsForeignKey() != tt.isForeignKey {
				t.Errorf("IsForeignKey = %v, want %v", col.IsForeignKey(), tt.isForeignKey)
			}
			if col.IsNullable() != tt.isNullable {
				t.Errorf("IsNullable = %v, want %v", col.IsNullable(), tt.isNullable)
			}
			if col.IsUnique() != tt.isUnique {
				t.Errorf("IsUnique = %v, want %v", col.IsUnique(), tt.isUnique)
			}
		})
	}
}
