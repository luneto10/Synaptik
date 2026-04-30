package diagram_test

import (
	"errors"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestValidateDecimalPrecisionScale(t *testing.T) {
	tests := []struct {
		name      string
		precision int
		scale     int
		wantErr   bool
	}{
		{name: "scale exceeds precision", precision: 4, scale: 5, wantErr: true},
		{name: "precision below min", precision: 0, scale: 0, wantErr: true},
		{name: "precision above max", precision: 66, scale: 2, wantErr: true},
		{name: "scale above max", precision: 10, scale: 31, wantErr: true},
		{name: "valid typical", precision: 10, scale: 2, wantErr: false},
		{name: "valid max bounds", precision: 65, scale: 30, wantErr: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := diagram.ValidateDecimalPrecisionScale(tt.precision, tt.scale, "col")
			if tt.wantErr {
				if err == nil || !errors.Is(err, apperrors.ErrInvalid) {
					t.Fatalf("want ErrInvalid, got %v", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestNewDbColumn_Getters(t *testing.T) {
	ref := diagram.NewColumnReference("t2", "c2")
	col := newDbColumn("c1", "email", diagram.ColumnTypeText, false, false, true, true, &ref)

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
	col := newDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil)
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
			col := newDbColumn("c1", "col", diagram.ColumnTypeText,
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
