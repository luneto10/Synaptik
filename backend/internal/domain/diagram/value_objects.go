package diagram

import (
	"fmt"
	"strings"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
)

// ColumnType represents the SQL column data type.
type ColumnType string

const (
	ColumnTypeUUID      ColumnType = "uuid"
	ColumnTypeText      ColumnType = "text"
	ColumnTypeChar      ColumnType = "char"
	ColumnTypeVarchar   ColumnType = "varchar"
	ColumnTypeInt       ColumnType = "int"
	ColumnTypeBigint    ColumnType = "bigint"
	ColumnTypeBool      ColumnType = "bool"
	ColumnTypeTimestamp ColumnType = "timestamp"
	ColumnTypeJSON      ColumnType = "json"
	ColumnTypeJSONB     ColumnType = "jsonb"
	ColumnTypeDecimal   ColumnType = "decimal"
	ColumnTypeFloat     ColumnType = "float"
)

func NewColumnType(raw string) (ColumnType, error) {
	normalized := ColumnType(strings.TrimSpace(strings.ToLower(raw)))
	if normalized == "" {
		return "", fmt.Errorf("invalid column type %q: %w", raw, apperrors.ErrInvalid)
	}
	return normalized, nil
}

type Dialect string

// DefaultSQLDialect is used when a convert request omits dialect.
const DefaultSQLDialect Dialect = "postgres"

func NewDialect(raw string) (Dialect, error) {
	normalized := Dialect(strings.TrimSpace(strings.ToLower(raw)))

	if IsRegisteredDialect(normalized) {
		return normalized, nil
	}
	return "", fmt.Errorf("invalid dialect %q: %w", raw, apperrors.ErrInvalid)
}

// RelationshipType represents the cardinality between two tables.
type RelationshipType string

const (
	RelationshipOneToOne   RelationshipType = "one-to-one"
	RelationshipOneToMany  RelationshipType = "one-to-many"
	RelationshipManyToMany RelationshipType = "many-to-many"
)

func NewRelationshipType(raw string) (RelationshipType, error) {
	switch RelationshipType(raw) {
	case RelationshipOneToOne, RelationshipOneToMany, RelationshipManyToMany:
		return RelationshipType(raw), nil
	}
	return "", fmt.Errorf("invalid relationship type %q: %w", raw, apperrors.ErrInvalid)
}
