package ddlspec

import (
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func SupportsAutoIncrementType(columnType diagram.ColumnType) bool {
	return columnType == diagram.ColumnTypeInt || columnType == diagram.ColumnTypeBigint
}

// PositiveOrDefault returns value if non-nil and *value > 0, otherwise a pointer to fallback.
func PositiveOrDefault(value *int, fallback int) *int {
	if value == nil || *value <= 0 {
		return &fallback
	}
	return value
}

// RequirePrecisionScale applies dialect defaults for omitted precision/scale, then runs
// the same bounds + scale≤precision rules as diagram.ValidateTypeOptions for explicit pairs.
func RequirePrecisionScale(column diagram.DbColumn) (*int, *int, error) {
	precision := PositiveOrDefault(column.TypeOptions().Precision(), 10)
	scale := PositiveOrDefault(column.TypeOptions().Scale(), 2)
	if err := diagram.ValidateDecimalPrecisionScale(*precision, *scale, column.Name()); err != nil {
		return nil, nil, err
	}
	return precision, scale, nil
}
