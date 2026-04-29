package sqlgen

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func supportsAutoIncrementType(columnType diagram.ColumnType) bool {
	return columnType == diagram.ColumnTypeInt || columnType == diagram.ColumnTypeBigint
}

func requirePositive(columnName, label string, value *int) (*int, error) {
	if value == nil || *value <= 0 {
		return nil, fmt.Errorf("column %q: %s must be a positive integer: %w", columnName, label, apperrors.ErrInvalid)
	}
	return value, nil
}

func positiveOrDefault(value *int, fallback int) *int {
	if value == nil || *value <= 0 {
		return &fallback
	}
	return value
}

func requirePrecisionScale(column diagram.DbColumn) (*int, *int, error) {
	precision := positiveOrDefault(column.TypeOptions().Precision(), 10)
	scale := positiveOrDefault(column.TypeOptions().Scale(), 2)
	if *scale > *precision {
		return nil, nil, fmt.Errorf("column %q: decimal scale cannot exceed precision: %w", column.Name(), apperrors.ErrInvalid)
	}
	return precision, scale, nil
}
