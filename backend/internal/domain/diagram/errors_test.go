package diagram_test

import (
	"errors"
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestDiagramErrors_WrapApperrors(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		sentinel error
	}{
		{"ErrNotFound wraps apperrors.ErrNotFound", diagram.ErrNotFound, apperrors.ErrNotFound},
		{"ErrInvalidNode wraps apperrors.ErrInvalid", diagram.ErrInvalidNode, apperrors.ErrInvalid},
		{"ErrInvalidColumn wraps apperrors.ErrInvalid", diagram.ErrInvalidColumn, apperrors.ErrInvalid},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !errors.Is(tt.err, tt.sentinel) {
				t.Errorf("errors.Is(%v, %v) = false, want true", tt.err, tt.sentinel)
			}
		})
	}
}
