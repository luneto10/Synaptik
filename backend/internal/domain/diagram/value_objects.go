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

const (
	DialectPostgres Dialect = "postgres"
	DialectMySQL    Dialect = "mysql"
)

func NewDialect(raw string) (Dialect, error) {
	switch Dialect(strings.TrimSpace(strings.ToLower(raw))) {
	case DialectPostgres, DialectMySQL:
		return Dialect(strings.TrimSpace(strings.ToLower(raw))), nil
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
