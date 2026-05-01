package ddlspec_test

import (
	"errors"
	"slices"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram/ddlspec"
)

func TestBuildStandardModifiers(t *testing.T) {
	t.Run("generated UUID and inline reference", func(t *testing.T) {
		ref := ddlspec.ColumnInfo{TableName: "users", ColumnName: "id"}
		column := diagram.NewDbColumn("c1", "user_id", diagram.ColumnTypeUUID, diagram.DbColumnProps{
			IsGeneratedUUID: true,
			IsForeignKey:    true,
			References:      ptrRef(diagram.NewColumnReference("t1", "c2")),
		})

		mods, err := ddlspec.BuildStandardModifiers(column, ddlspec.ColumnContext{
			Reference: &ref,
		}, ddlspec.ModifierConfig{
			GeneratedUUIDClause: " DEFAULT gen_random_uuid()",
			AutoIncrementClause: " AUTO_INCREMENT",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !contains(mods, " DEFAULT gen_random_uuid()") {
			t.Fatalf("expected generated uuid modifier, got %v", mods)
		}
		if !contains(mods, " REFERENCES users (id)") {
			t.Fatalf("expected inline reference, got %v", mods)
		}
	})

	t.Run("autoincrement invalid type", func(t *testing.T) {
		column := diagram.NewDbColumn("c1", "name", diagram.ColumnTypeText, diagram.DbColumnProps{
			IsAutoIncrement: true,
		})

		_, err := ddlspec.BuildStandardModifiers(column, ddlspec.ColumnContext{}, ddlspec.ModifierConfig{
			GeneratedUUIDClause: " DEFAULT gen_random_uuid()",
			AutoIncrementClause: " AUTO_INCREMENT",
		})
		if err == nil || !errors.Is(err, apperrors.ErrInvalid) {
			t.Fatalf("expected ErrInvalid, got %v", err)
		}
	})
}

func ptrRef(r diagram.ColumnReference) *diagram.ColumnReference {
	return &r
}

func contains(values []string, want string) bool {
	return slices.Contains(values, want)
}
