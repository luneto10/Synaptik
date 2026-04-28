package diagram

import "errors"

// ColumnType represents the SQL column data type.
type ColumnType string

const (
	ColumnTypeUUID      ColumnType = "uuid"
	ColumnTypeText      ColumnType = "text"
	ColumnTypeVarchar   ColumnType = "varchar"
	ColumnTypeInt       ColumnType = "int"
	ColumnTypeBigint    ColumnType = "bigint"
	ColumnTypeBoolean   ColumnType = "boolean"
	ColumnTypeTimestamp ColumnType = "timestamp"
	ColumnTypeJSONB     ColumnType = "jsonb"
	ColumnTypeFloat     ColumnType = "float"
)

func NewColumnType(raw string) (ColumnType, error) {
	switch ColumnType(raw) {
	case ColumnTypeUUID, ColumnTypeText, ColumnTypeVarchar, ColumnTypeInt,
		ColumnTypeBigint, ColumnTypeBoolean, ColumnTypeTimestamp, ColumnTypeJSONB, ColumnTypeFloat:
		return ColumnType(raw), nil
	}
	return "", errors.New("invalid column type: " + raw)
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
	return "", errors.New("invalid relationship type: " + raw)
}
