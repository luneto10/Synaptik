package diagram_test

import (
	"testing"

	"github.com/luneto10/synaptik/backend/internal/domain/diagram"
)

func TestNewRelationship_Getters(t *testing.T) {
	rel := diagram.NewRelationship("r1", "c1", "c2", diagram.RelationshipOneToMany)

	if rel.ID() != "r1" {
		t.Errorf("ID = %q, want %q", rel.ID(), "r1")
	}
	if rel.SourceColumnID() != "c1" {
		t.Errorf("SourceColumnID = %q, want %q", rel.SourceColumnID(), "c1")
	}
	if rel.TargetColumnID() != "c2" {
		t.Errorf("TargetColumnID = %q, want %q", rel.TargetColumnID(), "c2")
	}
	if rel.RelationshipType() != diagram.RelationshipOneToMany {
		t.Errorf("RelationshipType = %q, want %q", rel.RelationshipType(), diagram.RelationshipOneToMany)
	}
}
