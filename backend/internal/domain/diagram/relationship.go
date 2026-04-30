package diagram

import (
	"fmt"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
)

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

// ValidateEndpoints checks that source and target columns exist in the diagram.
func (r Relationship) ValidateEndpoints(columnIDs map[ColumnID]struct{}) error {
	if _, ok := columnIDs[r.sourceColumnID]; !ok {
		return fmt.Errorf(
			"relationship %q: unknown source column %q: %w",
			r.id,
			r.sourceColumnID,
			apperrors.ErrInvalid,
		)
	}
	if _, ok := columnIDs[r.targetColumnID]; !ok {
		return fmt.Errorf(
			"relationship %q: unknown target column %q: %w",
			r.id,
			r.targetColumnID,
			apperrors.ErrInvalid,
		)
	}
	return nil
}
