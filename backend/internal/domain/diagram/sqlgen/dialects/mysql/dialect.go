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
	modifiers, err := ddlspec.BuildStandardModifiers(column, ctx, ddlspec.ModifierConfig{
		GeneratedUUIDClause: " DEFAULT (UUID())",
		AutoIncrementClause: " AUTO_INCREMENT",
	})
	if err != nil {
		return "", err
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
