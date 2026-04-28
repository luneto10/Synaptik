package apperrors_test

import (
	"errors"
	"fmt"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
)

func TestSentinels_CanBeWrappedAndUnwrapped(t *testing.T) {
	tests := []struct {
		name      string
		sentinel  error
		wrapped   error
	}{
		{"not found", apperrors.ErrNotFound, fmt.Errorf("diagram not found: %w", apperrors.ErrNotFound)},
		{"conflict", apperrors.ErrConflict, fmt.Errorf("email already registered: %w", apperrors.ErrConflict)},
		{"unauthorized", apperrors.ErrUnauthorized, fmt.Errorf("access denied: %w", apperrors.ErrUnauthorized)},
		{"invalid", apperrors.ErrInvalid, fmt.Errorf("invalid column: %w", apperrors.ErrInvalid)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !errors.Is(tt.wrapped, tt.sentinel) {
				t.Errorf("errors.Is(%q, %q) = false, want true", tt.wrapped, tt.sentinel)
			}
		})
	}
}
