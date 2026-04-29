package diagramapp

import "github.com/luneto10/synaptik/backend/internal/domain/diagram"
import "github.com/luneto10/synaptik/backend/internal/domain/diagram/sqlgen"

type ConvertToSQLUseCase struct{}

func NewConvertToSQLUseCase() *ConvertToSQLUseCase {
	return &ConvertToSQLUseCase{}
}

func (uc *ConvertToSQLUseCase) Execute(req DiagramRequest) (string, error) {
	dialectID := req.Dialect
	if dialectID == "" {
		dialectID = "postgres"
	}

	dialect, err := diagram.NewDialect(dialectID)
	if err != nil {
		return "", err
	}

	tables, rels, err := ToDomainDiagram(req)
	if err != nil {
		return "", err
	}
	return sqlgen.GenerateForDialect(dialect, tables, rels)
}
