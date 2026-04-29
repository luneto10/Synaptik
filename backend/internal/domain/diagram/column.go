package diagram

type ColumnID string

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
