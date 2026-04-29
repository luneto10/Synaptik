package diagramapp

import "github.com/luneto10/synaptik/backend/internal/domain/diagram"

func toDomainRelationship(req RelationshipRequest) (diagram.Relationship, error) {
	relType, err := diagram.NewRelationshipType(req.RelationshipType)
	if err != nil {
		return diagram.Relationship{}, err
	}
	return diagram.NewRelationship(
		diagram.EdgeID(req.ID),
		diagram.ColumnID(req.SourceColumnID),
		diagram.ColumnID(req.TargetColumnID),
		relType,
	), nil
}
