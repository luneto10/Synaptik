package sqlgen

// SQL format strings — unexported implementation details.
// Use the statement builder functions (statement.go) instead of these directly.
const (
	fmtCreateTable = "CREATE TABLE %s (\n%s\n);"
	fmtColumn      = "\t%s %s%s"
	fmtFK          = "ALTER TABLE %s ADD CONSTRAINT fk_%s FOREIGN KEY (%s) REFERENCES %s (%s);"
	fmtPK          = " PRIMARY KEY"
	fmtUnique      = " UNIQUE"
	fmtNotNull     = " NOT NULL"

	fmtCompositePK = "\tPRIMARY KEY (%s)"
)
