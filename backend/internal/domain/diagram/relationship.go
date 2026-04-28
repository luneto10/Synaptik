package diagram

type EdgeID string

// Relationship represents a directed relation between two tables via their columns.
type Relationship struct {
	id               EdgeID
	sourceColumnID   ColumnID
	targetColumnID   ColumnID
	relationshipType RelationshipType
}

func NewRelationship(id EdgeID, sourceColumnID, targetColumnID ColumnID, relationshipType RelationshipType) Relationship {
	return Relationship{
		id:               id,
		sourceColumnID:   sourceColumnID,
		targetColumnID:   targetColumnID,
		relationshipType: relationshipType,
	}
}

func (r Relationship) ID() EdgeID                         { return r.id }
func (r Relationship) SourceColumnID() ColumnID           { return r.sourceColumnID }
func (r Relationship) TargetColumnID() ColumnID           { return r.targetColumnID }
func (r Relationship) RelationshipType() RelationshipType { return r.relationshipType }
