package diagram

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
)

type ColumnID string

const (
	MinStringTypeLength = 1
	MaxStringTypeLength = 65535
	MinDecimalPrecision = 1
	MaxDecimalPrecision = 65
	MinDecimalScale     = 0
	MaxDecimalScale     = 30
)

type ColumnTypeOptions struct {
	length    *int
	precision *int
	scale     *int
}

func NewColumnTypeOptions(length, precision, scale *int) ColumnTypeOptions {
	return ColumnTypeOptions{
		length:    length,
		precision: precision,
		scale:     scale,
	}
}

func (o ColumnTypeOptions) Length() *int    { return o.length }
func (o ColumnTypeOptions) Precision() *int { return o.precision }
func (o ColumnTypeOptions) Scale() *int     { return o.scale }

func (o ColumnTypeOptions) validateCharLikeLength(columnName string) error {
	length := o.Length()
	if length == nil {
		return nil
	}
	if *length < MinStringTypeLength || *length > MaxStringTypeLength {
		return fmt.Errorf(
			"column %q: length must be between %d and %d: %w",
			columnName,
			MinStringTypeLength,
			MaxStringTypeLength,
			apperrors.ErrInvalid,
		)
	}
	return nil
}

// ValidateDecimalPrecisionScale checks bounds and scale ≤ precision for resolved
// decimal precision/scale (including generator defaults). Used by domain validation
// and by ddlspec so rules stay in one place.
func ValidateDecimalPrecisionScale(precision, scale int, columnName string) error {
	if precision < MinDecimalPrecision || precision > MaxDecimalPrecision {
		return fmt.Errorf(
			"column %q: precision must be between %d and %d: %w",
			columnName,
			MinDecimalPrecision,
			MaxDecimalPrecision,
			apperrors.ErrInvalid,
		)
	}
	if scale < MinDecimalScale || scale > MaxDecimalScale {
		return fmt.Errorf(
			"column %q: scale must be between %d and %d: %w",
			columnName,
			MinDecimalScale,
			MaxDecimalScale,
			apperrors.ErrInvalid,
		)
	}
	if scale > precision {
		return fmt.Errorf(
			"column %q: scale cannot be greater than precision: %w",
			columnName,
			apperrors.ErrInvalid,
		)
	}
	return nil
}

func (o ColumnTypeOptions) validateDecimal(columnName string) error {
	precision := o.Precision()
	scale := o.Scale()
	if precision == nil || scale == nil {
		return nil
	}
	return ValidateDecimalPrecisionScale(*precision, *scale, columnName)
}

// DbColumn is a single column within a DbTable.
type DbColumn struct {
	id              ColumnID
	name            string
	columnType      ColumnType
	typeOptions     ColumnTypeOptions
	isPrimaryKey    bool
	isForeignKey    bool
	isNullable      bool
	isUnique        bool
	isAutoIncrement bool
	isGeneratedUUID bool
	references      *ColumnReference
}

type DbColumnProps struct {
	TypeOptions     ColumnTypeOptions
	IsPrimaryKey    bool
	IsForeignKey    bool
	IsNullable      bool
	IsUnique        bool
	IsAutoIncrement bool
	IsGeneratedUUID bool
	References      *ColumnReference
}

func NewDbColumn(
	id ColumnID,
	name string,
	columnType ColumnType,
	props DbColumnProps,
) DbColumn {
	if props.TypeOptions == (ColumnTypeOptions{}) {
		props.TypeOptions = NewColumnTypeOptions(nil, nil, nil)
	}

	return DbColumn{
		id:              id,
		name:            name,
		columnType:      columnType,
		typeOptions:     props.TypeOptions,
		isPrimaryKey:    props.IsPrimaryKey,
		isForeignKey:    props.IsForeignKey,
		isNullable:      props.IsNullable,
		isUnique:        props.IsUnique,
		isAutoIncrement: props.IsAutoIncrement,
		isGeneratedUUID: props.IsGeneratedUUID,
		references:      props.References,
	}
}

func (c DbColumn) ID() ColumnID                   { return c.id }
func (c DbColumn) Name() string                   { return c.name }
func (c DbColumn) Type() ColumnType               { return c.columnType }
func (c DbColumn) TypeOptions() ColumnTypeOptions { return c.typeOptions }
func (c DbColumn) IsPrimaryKey() bool             { return c.isPrimaryKey }
func (c DbColumn) IsForeignKey() bool             { return c.isForeignKey }
func (c DbColumn) IsNullable() bool               { return c.isNullable }
func (c DbColumn) IsUnique() bool                 { return c.isUnique }
func (c DbColumn) IsAutoIncrement() bool          { return c.isAutoIncrement }
func (c DbColumn) IsGeneratedUUID() bool          { return c.isGeneratedUUID }
func (c DbColumn) References() *ColumnReference   { return c.references }

func (c DbColumn) validateReferenceIfPresent(
	tableIDs map[TableID]struct{},
	tableColumnIDs map[TableID]map[ColumnID]struct{},
) error {
	ref := c.References()
	if ref == nil {
		return nil
	}
	return ref.ValidateTargetExists(tableIDs, tableColumnIDs, c.Name())
}

// ValidateTypeOptions checks optional length / precision / scale for the column's SQL type.
func (c DbColumn) ValidateTypeOptions() error {
	switch c.columnType {
	case ColumnTypeChar, ColumnTypeVarchar:
		return c.typeOptions.validateCharLikeLength(c.name)
	case ColumnTypeDecimal:
		return c.typeOptions.validateDecimal(c.name)
	default:
		return nil
	}
}

// ColumnReference points to the column this FK references.
type ColumnReference struct {
	tableID  TableID
	columnID ColumnID
}

func NewColumnReference(tableID TableID, columnID ColumnID) ColumnReference {
	return ColumnReference{tableID: tableID, columnID: columnID}
}

func (r ColumnReference) TableID() TableID   { return r.tableID }
func (r ColumnReference) ColumnID() ColumnID { return r.columnID }

// ValidateTargetExists checks that this reference points to a table and column
func (r ColumnReference) ValidateTargetExists(
	tableIDs map[TableID]struct{},
	tableColumnIDs map[TableID]map[ColumnID]struct{},
	referencingColumnName string,
) error {
	if _, ok := tableIDs[r.tableID]; !ok {
		return fmt.Errorf(
			"column %q: references unknown table %q: %w",
			referencingColumnName,
			r.tableID,
			apperrors.ErrInvalid,
		)
	}
	columns, ok := tableColumnIDs[r.tableID]
	if !ok {
		return fmt.Errorf(
			"column %q: references unknown table %q: %w",
			referencingColumnName,
			r.tableID,
			apperrors.ErrInvalid,
		)
	}
	if _, ok := columns[r.columnID]; !ok {
		return fmt.Errorf(
			"column %q: table %q does not contain referenced column %q: %w",
			referencingColumnName,
			r.tableID,
			r.columnID,
			apperrors.ErrInvalid,
		)
	}
	return nil
}
