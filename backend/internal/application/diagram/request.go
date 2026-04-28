package diagramapp

// --- Column ---

type ColumnReferenceRequest struct {
	TableID  string `json:"tableId"`
	ColumnID string `json:"columnId"`
}

type DbColumnRequest struct {
	ID           string                  `json:"id"           binding:"required"`
	Name         string                  `json:"name"         binding:"required"`
	Type         string                  `json:"type"         binding:"required"`
	IsPrimaryKey bool                    `json:"isPrimaryKey"`
	IsForeignKey bool                    `json:"isForeignKey"`
	IsNullable   bool                    `json:"isNullable"`
	IsUnique     bool                    `json:"isUnique"`
	References   *ColumnReferenceRequest `json:"references,omitempty"`
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
	Tables        []DbTableRequest      `json:"tables"        binding:"required"`
	Relationships []RelationshipRequest `json:"relationships" binding:"required"`
}
