package sqlgen

import (
	"strings"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestInternalColumnDef(t *testing.T) {
	tests := []struct {
		name        string
		col         diagram.DbColumn
		wantPK      bool
		wantNotNull bool
		wantUnique  bool
	}{
		{
			name:        "primary key: only PK modifier, no NOT NULL or UNIQUE",
			col:         diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			wantPK:      true,
			wantNotNull: false,
			wantUnique:  false,
		},
		{
			name:        "nullable column: no modifiers",
			col:         diagram.NewDbColumn("c1", "bio", diagram.ColumnTypeText, false, false, true, false, nil),
			wantPK:      false,
			wantNotNull: false,
			wantUnique:  false,
		},
		{
			name:        "non-nullable, unique: NOT NULL + UNIQUE",
			col:         diagram.NewDbColumn("c1", "email", diagram.ColumnTypeText, false, false, false, true, nil),
			wantPK:      false,
			wantNotNull: true,
			wantUnique:  true,
		},
		{
			name:        "non-nullable non-PK: only NOT NULL",
			col:         diagram.NewDbColumn("c1", "name", diagram.ColumnTypeText, false, false, false, false, nil),
			wantPK:      false,
			wantNotNull: true,
			wantUnique:  false,
		},
		{
			name:        "PK + unique flag: only PRIMARY KEY (UNIQUE is redundant for PK)",
			col:         diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, true, nil),
			wantPK:      true,
			wantNotNull: false,
			wantUnique:  false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := columnDef(tt.col)
			check := func(want bool, substring, label string) {
				t.Helper()
				has := strings.Contains(got, substring)
				if want && !has {
					t.Errorf("expected %s in %q", label, got)
				}
				if !want && has {
					t.Errorf("unexpected %s in %q", label, got)
				}
			}
			check(tt.wantPK, "PRIMARY KEY", "PRIMARY KEY")
			check(tt.wantNotNull, "NOT NULL", "NOT NULL")
			check(tt.wantUnique, "UNIQUE", "UNIQUE")
		})
	}
}

func TestInternalModsWithoutPK(t *testing.T) {
	tests := []struct {
		name        string
		col         diagram.DbColumn
		wantNotNull bool
		wantUnique  bool
	}{
		{
			name:        "nullable: no mods",
			col:         diagram.NewDbColumn("c1", "x", diagram.ColumnTypeText, false, false, true, false, nil),
			wantNotNull: false,
			wantUnique:  false,
		},
		{
			name:        "non-nullable: NOT NULL",
			col:         diagram.NewDbColumn("c1", "x", diagram.ColumnTypeText, false, false, false, false, nil),
			wantNotNull: true,
			wantUnique:  false,
		},
		{
			name:        "non-nullable + unique: both",
			col:         diagram.NewDbColumn("c1", "x", diagram.ColumnTypeText, false, false, false, true, nil),
			wantNotNull: true,
			wantUnique:  true,
		},
		{
			name:        "PK column with isNullable=false: NOT NULL added (PK flag ignored by this helper)",
			col:         diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			wantNotNull: true,
			wantUnique:  false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mods := modsWithoutPK(tt.col)
			joined := strings.Join(mods, " ")
			if tt.wantNotNull && !strings.Contains(joined, "NOT NULL") {
				t.Errorf("expected NOT NULL, got mods: %v", mods)
			}
			if !tt.wantNotNull && strings.Contains(joined, "NOT NULL") {
				t.Errorf("unexpected NOT NULL, got mods: %v", mods)
			}
			if tt.wantUnique && !strings.Contains(joined, "UNIQUE") {
				t.Errorf("expected UNIQUE, got mods: %v", mods)
			}
			if !tt.wantUnique && strings.Contains(joined, "UNIQUE") {
				t.Errorf("unexpected UNIQUE, got mods: %v", mods)
			}
		})
	}
}

func TestInternalGetPrimaryKeyColumns(t *testing.T) {
	tests := []struct {
		name  string
		table diagram.DbTable
		want  []string
	}{
		{
			name: "no PK columns",
			table: diagram.NewDbTable("t1", "logs", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "msg", diagram.ColumnTypeText, false, false, true, false, nil),
			}),
			want: nil,
		},
		{
			name: "single PK",
			table: diagram.NewDbTable("t1", "users", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c2", "email", diagram.ColumnTypeText, false, false, false, false, nil),
			}),
			want: []string{"id"},
		},
		{
			name: "composite PK on junction table",
			table: diagram.NewJunctionTable("j1", "post_tag", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "post_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c2", "tag_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			}),
			want: []string{"post_id", "tag_id"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := getPrimaryKeyColumns(tt.table)
			if len(got) != len(tt.want) {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
			for i, name := range tt.want {
				if got[i] != name {
					t.Errorf("col[%d]: got %q, want %q", i, got[i], name)
				}
			}
		})
	}
}

func TestInternalApplyCompositePK(t *testing.T) {
	buildDefs := func(tbl diagram.DbTable) []string {
		var defs []string
		for _, c := range tbl.Columns() {
			defs = append(defs, columnDef(c))
		}
		return defs
	}

	tests := []struct {
		name        string
		table       diagram.DbTable
		wantCPK     bool
		wantNoCPK   bool
	}{
		{
			name: "non-junction: colDefs unchanged",
			table: diagram.NewDbTable("t1", "users", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			}),
			wantCPK:   false,
			wantNoCPK: true,
		},
		{
			name: "junction with single PK: colDefs unchanged",
			table: diagram.NewJunctionTable("j1", "ab", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "a_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c2", "b_val", diagram.ColumnTypeText, false, false, false, false, nil),
			}),
			wantCPK:   false,
			wantNoCPK: false,
		},
		{
			name: "junction with two PKs: composite PK constraint appended",
			table: diagram.NewJunctionTable("j1", "post_tag", []diagram.DbColumn{
				diagram.NewDbColumn("c1", "post_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
				diagram.NewDbColumn("c2", "tag_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			}),
			wantCPK:   true,
			wantNoCPK: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := applyCompositePK(tt.table, buildDefs(tt.table))
			joined := strings.Join(got, "\n")

			if tt.wantCPK {
				if !strings.Contains(joined, "PRIMARY KEY (") {
					t.Errorf("expected composite PRIMARY KEY, got:\n%s", joined)
				}
				// Individual column defs must not carry standalone PRIMARY KEY.
				for i, def := range got[:len(tt.table.Columns())] {
					if strings.Contains(def, "PRIMARY KEY") {
						t.Errorf("col[%d] should not have individual PRIMARY KEY: %s", i, def)
					}
				}
			}
			if tt.wantNoCPK && strings.Contains(joined, "PRIMARY KEY (") {
				t.Errorf("unexpected composite PRIMARY KEY, got:\n%s", joined)
			}
		})
	}
}

func TestInternalBuildTableDDL(t *testing.T) {
	t.Run("no FK columns: fkStmts empty", func(t *testing.T) {
		table := diagram.NewDbTable("t1", "users", []diagram.DbColumn{
			diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("c2", "email", diagram.ColumnTypeText, false, false, false, true, nil),
		})
		colDefs, fkStmts := buildTableDDL(table, buildColumnIndex([]diagram.DbTable{table}))
		if len(colDefs) != 2 {
			t.Errorf("colDefs len = %d, want 2", len(colDefs))
		}
		if len(fkStmts) != 0 {
			t.Errorf("fkStmts len = %d, want 0", len(fkStmts))
		}
	})

	t.Run("FK column: one fkStmt generated", func(t *testing.T) {
		ref := diagram.NewColumnReference("t1", "c1")
		users := diagram.NewDbTable("t1", "users", []diagram.DbColumn{
			diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
		})
		posts := diagram.NewDbTable("t2", "posts", []diagram.DbColumn{
			diagram.NewDbColumn("c2", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("c3", "user_id", diagram.ColumnTypeUUID, false, true, false, false, &ref),
		})
		colIndex := buildColumnIndex([]diagram.DbTable{users, posts})

		colDefs, fkStmts := buildTableDDL(posts, colIndex)
		if len(colDefs) != 2 {
			t.Errorf("colDefs len = %d, want 2", len(colDefs))
		}
		if len(fkStmts) != 1 {
			t.Errorf("fkStmts len = %d, want 1", len(fkStmts))
		}
		if !strings.Contains(fkStmts[0], "REFERENCES users") {
			t.Errorf("missing REFERENCES users in: %s", fkStmts[0])
		}
	})

	t.Run("junction table with 2 PKs: composite PK applied", func(t *testing.T) {
		junction := diagram.NewJunctionTable("j1", "post_tag", []diagram.DbColumn{
			diagram.NewDbColumn("c1", "post_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("c2", "tag_id", diagram.ColumnTypeUUID, true, false, false, false, nil),
		})
		colDefs, _ := buildTableDDL(junction, buildColumnIndex([]diagram.DbTable{junction}))
		joined := strings.Join(colDefs, "\n")
		if !strings.Contains(joined, "PRIMARY KEY (post_id, tag_id)") {
			t.Errorf("expected composite PRIMARY KEY, got:\n%s", joined)
		}
	})
}
