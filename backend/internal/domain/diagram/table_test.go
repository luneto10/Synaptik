package diagram_test

import (
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestNewDbTable_Getters(t *testing.T) {
	cols := []diagram.DbColumn{
		diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
		diagram.NewDbColumn("c2", "name", diagram.ColumnTypeText, false, false, true, false, nil),
	}

	table := diagram.NewDbTable("t1", "users", cols)

	if table.ID() != "t1" {
		t.Errorf("ID = %q, want %q", table.ID(), "t1")
	}
	if table.Name() != "users" {
		t.Errorf("Name = %q, want %q", table.Name(), "users")
	}
	if len(table.Columns()) != 2 {
		t.Errorf("Columns len = %d, want 2", len(table.Columns()))
	}
}
