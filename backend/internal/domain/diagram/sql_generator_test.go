package diagram_test

import (
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestGenerateSQL_EmptyDiagram(t *testing.T) {
	sql, err := diagram.GenerateSQL(nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	_ = sql
}
