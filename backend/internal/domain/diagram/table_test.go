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
	if table.IsJunction() {
		t.Error("IsJunction = true, want false for regular table")
	}
}

func TestNewJunctionTable_IsJunction(t *testing.T) {
	cols := []diagram.DbColumn{
		diagram.NewDbColumn("c1", "post_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
		diagram.NewDbColumn("c2", "tag_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
	}
	table := diagram.NewJunctionTable("j1", "post_tag", cols)

	if !table.IsJunction() {
		t.Error("IsJunction = false, want true")
	}
	if table.ID() != "j1" {
		t.Errorf("ID = %q, want %q", table.ID(), "j1")
	}
	if table.Name() != "post_tag" {
		t.Errorf("Name = %q, want %q", table.Name(), "post_tag")
	}
	if len(table.Columns()) != 2 {
		t.Errorf("Columns len = %d, want 2", len(table.Columns()))
	}
}
