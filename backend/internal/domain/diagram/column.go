package diagram

type ColumnID string

// DbColumn is a single column within a DbTable.
type DbColumn struct {
	id           ColumnID
	name         string
	columnType   ColumnType
	isPrimaryKey bool
	isForeignKey bool
	isNullable   bool
	isUnique     bool
	references   *ColumnReference
}

func NewDbColumn(
	id ColumnID,
	name string,
	columnType ColumnType,
	isPrimaryKey, isForeignKey, isNullable, isUnique bool,
	references *ColumnReference,
) DbColumn {
	return DbColumn{
		id:           id,
		name:         name,
		columnType:   columnType,
		isPrimaryKey: isPrimaryKey,
		isForeignKey: isForeignKey,
		isNullable:   isNullable,
		isUnique:     isUnique,
		references:   references,
	}
}

func (c DbColumn) ID() ColumnID                 { return c.id }
func (c DbColumn) Name() string                 { return c.name }
func (c DbColumn) Type() ColumnType             { return c.columnType }
func (c DbColumn) IsPrimaryKey() bool           { return c.isPrimaryKey }
func (c DbColumn) IsForeignKey() bool           { return c.isForeignKey }
func (c DbColumn) IsNullable() bool             { return c.isNullable }
func (c DbColumn) IsUnique() bool               { return c.isUnique }
func (c DbColumn) References() *ColumnReference { return c.references }

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
