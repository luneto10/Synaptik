package ddlspec

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

type ModifierConfig struct {
	GeneratedUUIDClause string
	AutoIncrementClause string
}

// BuildStandardModifiers applies shared column modifier rules used by SQL dialects.
func BuildStandardModifiers(column diagram.DbColumn, ctx ColumnContext, cfg ModifierConfig) ([]string, error) {
	modifiers := make([]string, 0, 5)

	if column.IsGeneratedUUID() {
		if column.Type() != diagram.ColumnTypeUUID {
			return nil, fmt.Errorf("column %q: generated uuid is only supported for uuid columns: %w", column.Name(), apperrors.ErrInvalid)
		}
		if column.IsAutoIncrement() {
			return nil, fmt.Errorf("column %q: generated uuid cannot be combined with autoincrement: %w", column.Name(), apperrors.ErrInvalid)
		}
		modifiers = append(modifiers, cfg.GeneratedUUIDClause)
	}

	if !column.IsNullable() && (!column.IsPrimaryKey() || ctx.CompositePrimaryKey) {
		modifiers = append(modifiers, NotNull())
	}
	if column.IsUnique() && !column.IsPrimaryKey() {
		modifiers = append(modifiers, Unique())
	}

	if column.IsAutoIncrement() {
		if !SupportsAutoIncrementType(column.Type()) {
			return nil, fmt.Errorf("column %q: autoincrement is only supported for int and bigint: %w", column.Name(), apperrors.ErrInvalid)
		}
		modifiers = append(modifiers, cfg.AutoIncrementClause)
	}

	if ctx.Reference != nil {
		modifiers = append(modifiers, InlineReference(ctx.Reference.TableName, ctx.Reference.ColumnName))
	}
	if column.IsPrimaryKey() && !ctx.CompositePrimaryKey {
		modifiers = append(modifiers, PrimaryKey())
	}

	return modifiers, nil
}
