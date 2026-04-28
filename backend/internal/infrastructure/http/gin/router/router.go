package router

import (
	"github.com/gin-gonic/gin"

	"github.com/luneto10/synaptik/backend/internal/infrastructure/http/gin/handler"
)

type Router struct {
	engine *gin.Engine
}

func New(diagramHandler *handler.DiagramHandler) *Router {
	engine := gin.Default()

	v1 := engine.Group("/api/v1")
	{
		diagrams := v1.Group("/diagrams")
		{
			diagrams.POST("/convert/sql", diagramHandler.ConvertToSQL)
		}
	}

	return &Router{engine: engine}
}

func (r *Router) Run(addr string) error {
	return r.engine.Run(addr)
}
