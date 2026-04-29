package sqlgen

import (
	"fmt"
	"strings"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

type mysqlDialect struct{}

func init() {
	RegisterDialect(mysqlDialect{})
}

func (mysqlDialect) ID() diagram.Dialect {
	return diagram.DialectMySQL
}

func (mysqlDialect) CreateTable(tableName string, columnDefs []string) string {
	return fmt.Sprintf("CREATE TABLE %s (\n%s\n);", tableName, strings.Join(columnDefs, ",\n"))
}

func (mysqlDialect) BuildCompositePrimaryKey(columns []string) string {
	return fmt.Sprintf("\tPRIMARY KEY (%s)", strings.Join(columns, ", "))
}

func (d mysqlDialect) BuildColumnDefinition(column diagram.DbColumn, ctx columnContext) (string, error) {
	dataType, err := d.formatType(column)
	if err != nil {
		return "", err
	}

	modifiers := make([]string, 0, 5)
	if !column.IsNullable() && (!column.IsPrimaryKey() || ctx.compositePrimaryKey) {
		modifiers = append(modifiers, " NOT NULL")
	}
	if column.IsUnique() && !column.IsPrimaryKey() {
		modifiers = append(modifiers, " UNIQUE")
	}
	if column.IsAutoIncrement() {
		if !supportsAutoIncrementType(column.Type()) {
			return "", fmt.Errorf("column %q: autoincrement is only supported for int and bigint: %w", column.Name(), apperrors.ErrInvalid)
		}
		modifiers = append(modifiers, " AUTO_INCREMENT")
	}
	if ctx.reference != nil {
		modifiers = append(modifiers, fmt.Sprintf(" REFERENCES %s (%s)", ctx.reference.tableName, ctx.reference.columnName))
	}
	if column.IsPrimaryKey() && !ctx.compositePrimaryKey {
		modifiers = append(modifiers, " PRIMARY KEY")
	}

	return fmt.Sprintf("\t%s %s%s", column.Name(), dataType, strings.Join(modifiers, "")), nil
}

func (mysqlDialect) formatType(column diagram.DbColumn) (string, error) {
	switch column.Type() {
	case diagram.ColumnTypeUUID:
		return "char(36)", nil
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
