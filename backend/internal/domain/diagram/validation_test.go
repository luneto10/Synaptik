package diagram_test

import (
	"errors"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestValidateTable(t *testing.T) {
	tests := []struct {
		name    string
		table   diagram.DbTable
		wantErr bool
	}{
		{
			name: "valid table: unique column names",
			table: diagram.NewDbTable("t1", "users", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c2", "email", diagram.ColumnTypeText, false, false, false, true, nil),
			}),
			wantErr: false,
		},
		{
			name:    "valid table: no columns",
			table:   diagram.NewDbTable("t1", "empty", []diagram.DbColumn{}),
			wantErr: false,
		},
		{
			name: "invalid: duplicate column name",
			table: diagram.NewDbTable("t1", "users", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c2", "id", diagram.ColumnTypeText, false, false, false, false, nil),
			}),
			wantErr: true,
		},
		{
			name: "invalid: duplicate in junction table",
			table: diagram.NewJunctionTable("j1", "post_tag", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "post_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c2", "post_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			}),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := diagram.ValidateTable(tt.table)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if !errors.Is(err, apperrors.ErrInvalid) {
					t.Errorf("error should wrap apperrors.ErrInvalid, got: %v", err)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			}
		})
	}
}
