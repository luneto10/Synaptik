package sqlgen

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

type mysqlDialect struct{}

func init() {
	RegisterDialect(mysqlDialect{})
}

func (mysqlDialect) ID() diagram.Dialect {
	return "mysql"
}

func (mysqlDialect) CreateTable(tableName string, columnDefs []string) string {
	return CreateTable(tableName, columnDefs)
}

func (mysqlDialect) BuildCompositePrimaryKey(columns []string) string {
	return CompositePrimaryKey(columns...)
}

func (d mysqlDialect) BuildColumnDefinition(column diagram.DbColumn, ctx columnContext) (string, error) {
	dataType, err := d.formatType(column)
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
	if !column.IsNullable() && (!column.IsPrimaryKey() || ctx.compositePrimaryKey) {
		modifiers = append(modifiers, NotNull())
	}
	if column.IsUnique() && !column.IsPrimaryKey() {
		modifiers = append(modifiers, Unique())
	}
	if column.IsAutoIncrement() {
		if !supportsAutoIncrementType(column.Type()) {
			return "", fmt.Errorf("column %q: autoincrement is only supported for int and bigint: %w", column.Name(), apperrors.ErrInvalid)
		}
		modifiers = append(modifiers, " AUTO_INCREMENT")
	}
	if ctx.reference != nil {
		modifiers = append(modifiers, InlineReference(ctx.reference.tableName, ctx.reference.columnName))
	}
	if column.IsPrimaryKey() && !ctx.compositePrimaryKey {
		modifiers = append(modifiers, PrimaryKey())
	}

	return ColumnDef(column.Name(), dataType, modifiers...), nil
}

func (mysqlDialect) formatType(column diagram.DbColumn) (string, error) {
	switch column.Type() {
	case diagram.ColumnTypeUUID:
		return "char(36)", nil
	case diagram.ColumnTypeChar:
		length := positiveOrDefault(column.TypeOptions().Length(), 1)
		return fmt.Sprintf("char(%d)", *length), nil
	case diagram.ColumnTypeVarchar:
		length := positiveOrDefault(column.TypeOptions().Length(), 255)
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
		precision, scale, err := requirePrecisionScale(column)
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
