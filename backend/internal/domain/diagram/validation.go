package diagram

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
)

const (
	MinStringTypeLength = 1
	MaxStringTypeLength = 65535
	MinDecimalPrecision = 1
	MaxDecimalPrecision = 65
	MinDecimalScale     = 0
	MaxDecimalScale     = 30
)

// ValidateTable checks domain invariants for a table that cannot be enforced
// in the constructor without returning an error (e.g. uniqueness across the column slice).
func ValidateTable(t DbTable) error {
	seen := make(map[string]struct{}, len(t.Columns()))
	for _, c := range t.Columns() {
		if _, exists := seen[c.Name()]; exists {
			return fmt.Errorf("table %q: duplicate column name %q: %w", t.Name(), c.Name(), apperrors.ErrInvalid)
		}
		seen[c.Name()] = struct{}{}
		if err := validateColumnTypeOptions(c); err != nil {
			return fmt.Errorf("table %q: %w", t.Name(), err)
		}
	}
	return nil
}

func validateColumnTypeOptions(column DbColumn) error {
	switch column.Type() {
	case ColumnTypeChar, ColumnTypeVarchar:
		length := column.TypeOptions().Length()
		if length == nil {
			return nil
		}

		if *length < MinStringTypeLength || *length > MaxStringTypeLength {
			return fmt.Errorf(
				"column %q: length must be between %d and %d: %w",
				column.Name(),
				MinStringTypeLength,
				MaxStringTypeLength,
				apperrors.ErrInvalid,
			)
		}
	case ColumnTypeDecimal:
		precision := column.TypeOptions().Precision()
		scale := column.TypeOptions().Scale()
		if precision == nil || scale == nil {
			return nil
		}

		if *precision < MinDecimalPrecision || *precision > MaxDecimalPrecision {
			return fmt.Errorf(
				"column %q: precision must be between %d and %d: %w",
				column.Name(),
				MinDecimalPrecision,
				MaxDecimalPrecision,
				apperrors.ErrInvalid,
			)
		}

		if *scale < MinDecimalScale || *scale > MaxDecimalScale {
			return fmt.Errorf(
				"column %q: scale must be between %d and %d: %w",
				column.Name(),
				MinDecimalScale,
				MaxDecimalScale,
				apperrors.ErrInvalid,
			)
		}

		if *scale > *precision {
			return fmt.Errorf(
				"column %q: scale cannot be greater than precision: %w",
				column.Name(),
				apperrors.ErrInvalid,
			)
		}
	}

	return nil
}
