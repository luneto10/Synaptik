package sqlgen

import (
	"strings"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

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

func TestInternalBuildTableDDL(t *testing.T) {
	t.Run("regular PK: PRIMARY KEY inline, no NOT NULL", func(t *testing.T) {
		table := diagram.NewDbTable("t1", "users", []diagram.DbColumn{
			diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
		})
		defs := buildTableDDL(table, buildColumnIndex([]diagram.DbTable{table}))
		if len(defs) != 1 {
			t.Fatalf("expected 1 def, got %d", len(defs))
		}
		if !strings.Contains(defs[0], "PRIMARY KEY") {
			t.Errorf("expected PRIMARY KEY in: %s", defs[0])
		}
		if strings.Contains(defs[0], "NOT NULL") {
			t.Errorf("unexpected NOT NULL for PK column: %s", defs[0])
		}
	})

	t.Run("non-nullable non-PK: NOT NULL, no PRIMARY KEY", func(t *testing.T) {
		table := diagram.NewDbTable("t1", "users", []diagram.DbColumn{
			diagram.NewDbColumn("c1", "name", diagram.ColumnTypeText, false, false, false, false, nil),
		})
		defs := buildTableDDL(table, buildColumnIndex([]diagram.DbTable{table}))
		if !strings.Contains(defs[0], "NOT NULL") {
			t.Errorf("expected NOT NULL in: %s", defs[0])
		}
		if strings.Contains(defs[0], "PRIMARY KEY") {
			t.Errorf("unexpected PRIMARY KEY in: %s", defs[0])
		}
	})

	t.Run("FK column: inline REFERENCES, no ALTER TABLE", func(t *testing.T) {
		ref := diagram.NewColumnReference("t1", "c1")
		users := diagram.NewDbTable("t1", "users", []diagram.DbColumn{
			diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
		})
		posts := diagram.NewDbTable("t2", "posts", []diagram.DbColumn{
			diagram.NewDbColumn("c2", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
			diagram.NewDbColumn("c3", "user_id", diagram.ColumnTypeUUID, false, true, false, false, &ref),
		})
		defs := buildTableDDL(posts, buildColumnIndex([]diagram.DbTable{users, posts}))
		joined := strings.Join(defs, "\n")
		if !strings.Contains(joined, "REFERENCES users (id)") {
			t.Errorf("expected inline REFERENCES users (id), got:\n%s", joined)
		}
		if strings.Contains(joined, "ALTER TABLE") {
			t.Errorf("unexpected ALTER TABLE in column defs:\n%s", joined)
		}
	})

	t.Run("junction table: composite PK, NOT NULL on PK columns, inline REFERENCES", func(t *testing.T) {
		srcRef := diagram.NewColumnReference("t1", "c1")
		tgtRef := diagram.NewColumnReference("t2", "c2")
		posts := diagram.NewDbTable("t1", "posts", []diagram.DbColumn{
			diagram.NewDbColumn("c1", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
		})
		tags := diagram.NewDbTable("t2", "tags", []diagram.DbColumn{
			diagram.NewDbColumn("c2", "id", diagram.ColumnTypeUUID, true, false, false, false, nil),
		})
		junction := diagram.NewJunctionTable("j1", "post_tag", []diagram.DbColumn{
			diagram.NewDbColumn("j1", "post_id", diagram.ColumnTypeUUID, true, true, false, false, &srcRef),
			diagram.NewDbColumn("j2", "tag_id", diagram.ColumnTypeUUID, true, true, false, false, &tgtRef),
		})
		colIndex := buildColumnIndex([]diagram.DbTable{posts, tags, junction})
		defs := buildTableDDL(junction, colIndex)
		joined := strings.Join(defs, "\n")

		if !strings.Contains(joined, "PRIMARY KEY (post_id, tag_id)") {
			t.Errorf("expected composite PRIMARY KEY, got:\n%s", joined)
		}
		if !strings.Contains(joined, "NOT NULL") {
			t.Errorf("expected NOT NULL on junction PK columns, got:\n%s", joined)
		}
		if !strings.Contains(joined, "REFERENCES posts (id)") {
			t.Errorf("expected REFERENCES posts (id), got:\n%s", joined)
		}
		if !strings.Contains(joined, "REFERENCES tags (id)") {
			t.Errorf("expected REFERENCES tags (id), got:\n%s", joined)
		}
		// Individual column defs must not carry standalone PRIMARY KEY.
		for i, def := range defs[:len(junction.Columns())] {
			if strings.Contains(def, "PRIMARY KEY") {
				t.Errorf("col[%d] should not have per-column PRIMARY KEY: %s", i, def)
			}
		}
	})
}
