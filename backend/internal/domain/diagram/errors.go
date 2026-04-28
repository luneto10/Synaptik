package diagram

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
)

var (
	ErrNotFound      = fmt.Errorf("diagram not found: %w", apperrors.ErrNotFound)
	ErrInvalidNode   = fmt.Errorf("invalid node type: %w", apperrors.ErrInvalid)
	ErrInvalidColumn = fmt.Errorf("invalid column definition: %w", apperrors.ErrInvalid)
)
