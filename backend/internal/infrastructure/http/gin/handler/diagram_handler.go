package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	diagramapp "github.com/luneto10/synaptik/backend/internal/application/diagram"
	"github.com/luneto10/synaptik/backend/internal/infrastructure/http/gin/response"
)

type DiagramHandler struct {
	convertToSQL *diagramapp.ConvertToSQLUseCase
}

func NewDiagramHandler(convertToSQL *diagramapp.ConvertToSQLUseCase) *DiagramHandler {
	return &DiagramHandler{convertToSQL: convertToSQL}
}

func (h *DiagramHandler) ConvertToSQL(c *gin.Context) {
	var req diagramapp.DiagramRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	sql, err := h.convertToSQL.Execute(req)
	if err != nil {
		response.DomainError(c, err)
		return
	}
	response.OK(c, "diagram converted to SQL", sql)
}
