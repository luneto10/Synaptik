package mysql

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram/ddlspec"
)

type dialect struct{}

func init() {
	ddlspec.RegisterDialect(dialect{})
}

func (dialect) ID() diagram.Dialect {
	return "mysql"
}

func (dialect) CreateTable(tableName string, columnDefs []string) string {
	return ddlspec.CreateTable(tableName, columnDefs)
}

func (dialect) BuildCompositePrimaryKey(columns []string) string {
	return ddlspec.CompositePrimaryKey(columns...)
}

func (dialect) BuildColumnDefinition(column diagram.DbColumn, ctx ddlspec.ColumnContext) (string, error) {
	dataType, err := formatType(column)
	if err != nil {
		return "", err
	}

	modifiers := make([]string, 0, 5)
	if column.IsGeneratedUUID() {
		if column.Type() != diagram.ColumnTypeUUID {
			return "", fmt.Errorf("column %q: generated uuid is only supported for uuid columns: %w", column.Name(), apperrors.ErrInvalid)
		}
		if column.IsAutoIncrement() {
			return "", fmt.Errorf("column %q: generated uuid cannot be combined with autoincrement: %w", column.Name(), apperrors.ErrInvalid)
		}
		modifiers = append(modifiers, " DEFAULT (UUID())")
	}
	if !column.IsNullable() && (!column.IsPrimaryKey() || ctx.CompositePrimaryKey) {
		modifiers = append(modifiers, ddlspec.NotNull())
	}
	if column.IsUnique() && !column.IsPrimaryKey() {
		modifiers = append(modifiers, ddlspec.Unique())
	}
	if column.IsAutoIncrement() {
		if !ddlspec.SupportsAutoIncrementType(column.Type()) {
			return "", fmt.Errorf("column %q: autoincrement is only supported for int and bigint: %w", column.Name(), apperrors.ErrInvalid)
		}
		modifiers = append(modifiers, " AUTO_INCREMENT")
	}
	if ctx.Reference != nil {
		modifiers = append(modifiers, ddlspec.InlineReference(ctx.Reference.TableName, ctx.Reference.ColumnName))
	}
	if column.IsPrimaryKey() && !ctx.CompositePrimaryKey {
		modifiers = append(modifiers, ddlspec.PrimaryKey())
	}

	return ddlspec.ColumnDef(column.Name(), dataType, modifiers...), nil
}

func formatType(column diagram.DbColumn) (string, error) {
	switch column.Type() {
	case diagram.ColumnTypeUUID:
		return "char(36)", nil
	case diagram.ColumnTypeChar:
		length := ddlspec.PositiveOrDefault(column.TypeOptions().Length(), 1)
		return fmt.Sprintf("char(%d)", *length), nil
	case diagram.ColumnTypeVarchar:
		length := ddlspec.PositiveOrDefault(column.TypeOptions().Length(), 255)
		return fmt.Sprintf("varchar(%d)", *length), nil
	case diagram.ColumnTypeText:
		return "text", nil
	case diagram.ColumnTypeInt:
		return "int", nil
	case diagram.ColumnTypeBigint:
		return "bigint", nil
	case diagram.ColumnTypeBool:
		return "tinyint(1)", nil
	case diagram.ColumnTypeTimestamp:
		return "timestamp", nil
	case diagram.ColumnTypeJSON, diagram.ColumnTypeJSONB:
		return "json", nil
	case diagram.ColumnTypeDecimal:
		precision, scale, err := ddlspec.RequirePrecisionScale(column)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf("decimal(%d, %d)", *precision, *scale), nil
	case diagram.ColumnTypeFloat:
		return "float", nil
	default:
		return "", fmt.Errorf("column %q: type %q is not supported by mysql: %w", column.Name(), column.Type(), apperrors.ErrInvalid)
	}
}
