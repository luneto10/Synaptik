package apperrors

import "errors"

// Categorical sentinel errors. Domain errors should wrap these with %w
// so infrastructure can map them to HTTP status codes via errors.Is.
var (
	ErrNotFound     = errors.New("not found")
	ErrConflict     = errors.New("conflict")
	ErrUnauthorized = errors.New("unauthorized")
	ErrInvalid      = errors.New("invalid input")
)
