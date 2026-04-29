package sqlgen

import (
	"fmt"
	"strings"
)

// CreateTable builds a CREATE TABLE DDL statement from a table name and column definitions.
func CreateTable(tableName string, columnDefs []string) string {
	return fmt.Sprintf(fmtCreateTable, tableName, strings.Join(columnDefs, ",\n"))
}

// ColumnDef builds a column definition line for use inside a CREATE TABLE statement.
// Modifiers are appended in order:
//
//	ColumnDef("id",    "uuid", PrimaryKey(), NotNull())
//	ColumnDef("email", "text", NotNull(), Unique())
//	ColumnDef("bio",   "text")
func ColumnDef(name, dataType string, modifiers ...string) string {
	return fmt.Sprintf(fmtColumn, name, dataType, strings.Join(modifiers, ""))
}

// AddForeignKey builds an ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY statement.
func AddForeignKey(onTable, constraintName, column, referencesTable, referencesColumn string) string {
	return fmt.Sprintf(fmtFK, onTable, constraintName, column, referencesTable, referencesColumn)
}

// PrimaryKey returns the PRIMARY KEY column modifier.
func PrimaryKey() string { return fmtPK }

// NotNull returns the NOT NULL column modifier.
func NotNull() string { return fmtNotNull }

// Unique returns the UNIQUE column modifier.
func Unique() string { return fmtUnique }

// CompositePrimaryKey returns the PRIMARY KEY constraint line for multiple columns.
func CompositePrimaryKey(columns ...string) string {
	return fmt.Sprintf(fmtCompositePK, strings.Join(columns, ", "))
}

// InlineReference returns the REFERENCES clause appended directly to a column definition.
// Use this for FK columns when the referenced table is guaranteed to exist before this one.
// Fall back to AddForeignKey only for circular dependencies.
func InlineReference(referencesTable, referencesColumn string) string {
	return fmt.Sprintf(fmtInlineRef, referencesTable, referencesColumn)
}
