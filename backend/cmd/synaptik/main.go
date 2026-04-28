package main

import (
	"log"

	diagramapp "github.com/luneto10/synaptik/backend/internal/application/diagram"
	"github.com/luneto10/synaptik/backend/internal/infrastructure/http/gin/handler"
	"github.com/luneto10/synaptik/backend/internal/infrastructure/http/gin/router"
)

func main() {
	convertToSQL := diagramapp.NewConvertToSQLUseCase()
	diagramHandler := handler.NewDiagramHandler(convertToSQL)
	r := router.New(diagramHandler)

	log.Println("Synaptik API starting on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
