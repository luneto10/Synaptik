package diagram

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
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
	}
	return nil
}
