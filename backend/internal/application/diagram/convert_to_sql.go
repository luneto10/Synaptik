package diagramapp

import "github.com/luneto10/synaptik/backend/internal/domain/diagram/sqlgen"

type ConvertToSQLUseCase struct{}

func NewConvertToSQLUseCase() *ConvertToSQLUseCase {
	return &ConvertToSQLUseCase{}
}

func (uc *ConvertToSQLUseCase) Execute(req DiagramRequest) (string, error) {
	tables, rels, err := ToDomainDiagram(req)
	if err != nil {
		return "", err
	}
	return sqlgen.Generate(tables, rels)
}
