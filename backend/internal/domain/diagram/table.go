package diagram

type TableID string

// DbTable is the domain model for a database table.
type DbTable struct {
	id      TableID
	name    string
	columns []DbColumn
}

func NewDbTable(id TableID, name string, columns []DbColumn) DbTable {
	return DbTable{id: id, name: name, columns: columns}
}

func (t DbTable) ID() TableID         { return t.id }
func (t DbTable) Name() string        { return t.name }
func (t DbTable) Columns() []DbColumn { return t.columns }
