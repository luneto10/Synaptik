package diagram

type TableID string

// DbTable is the domain model for a database table.
type DbTable struct {
	id         TableID
	name       string
	columns    []DbColumn
	isJunction bool
}

func NewDbTable(id TableID, name string, columns []DbColumn) DbTable {
	return DbTable{id: id, name: name, columns: columns}
}

// NewJunctionTable creates a new table explicitly marked as a junction table.
func NewJunctionTable(id TableID, name string, columns []DbColumn) DbTable {
	return DbTable{id: id, name: name, columns: columns, isJunction: true}
}

func (t DbTable) ID() TableID         { return t.id }
func (t DbTable) Name() string        { return t.name }
func (t DbTable) Columns() []DbColumn { return t.columns }
func (t DbTable) IsJunction() bool    { return t.isJunction }
