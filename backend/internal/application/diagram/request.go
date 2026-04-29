package diagramapp

// --- Column ---

type ColumnTypeOptionsRequest struct {
	Length    *int `json:"length,omitempty"`
	Precision *int `json:"precision,omitempty"`
	Scale     *int `json:"scale,omitempty"`
}

type ColumnReferenceRequest struct {
	TableID  string `json:"tableId"`
	ColumnID string `json:"columnId"`
}

type DbColumnRequest struct {
	ID              string                   `json:"id"              binding:"required"`
	Name            string                   `json:"name"            binding:"required"`
	Type            string                   `json:"type"            binding:"required"`
	TypeOptions     ColumnTypeOptionsRequest `json:"typeOptions"`
	IsPrimaryKey    bool                     `json:"isPrimaryKey"`
	IsForeignKey    bool                     `json:"isForeignKey"`
	IsNullable      bool                     `json:"isNullable"`
	IsUnique        bool                     `json:"isUnique"`
	IsAutoIncrement bool                     `json:"isAutoIncrement"`
	References      *ColumnReferenceRequest  `json:"references,omitempty"`
}

// --- Table ---

type DbTableRequest struct {
	ID         string            `json:"id"         binding:"required"`
	Name       string            `json:"name"       binding:"required"`
	IsJunction bool              `json:"isJunction"`
	Columns    []DbColumnRequest `json:"columns"    binding:"required"`
}

// --- Relationship ---

type RelationshipRequest struct {
	ID               string `json:"id"               binding:"required"`
	SourceColumnID   string `json:"sourceColumnId"   binding:"required"`
	TargetColumnID   string `json:"targetColumnId"   binding:"required"`
	RelationshipType string `json:"relationshipType" binding:"required,oneof=one-to-one one-to-many many-to-many"`
}

// --- Diagram request ---

type DiagramRequest struct {
	Dialect       string                `json:"dialect"`
	Tables        []DbTableRequest      `json:"tables"        binding:"required"`
	Relationships []RelationshipRequest `json:"relationships" binding:"required"`
}
