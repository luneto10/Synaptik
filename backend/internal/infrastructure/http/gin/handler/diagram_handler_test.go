package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	diagramapp "github.com/luneto10/synaptik/backend/internal/application/diagram"
	"github.com/luneto10/synaptik/backend/internal/infrastructure/http/gin/handler"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newDiagramHandler() *handler.DiagramHandler {
	return handler.NewDiagramHandler(diagramapp.NewConvertToSQLUseCase())
}

func postJSON(t *testing.T, h *handler.DiagramHandler, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/diagrams/convert/sql", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	h.ConvertToSQL(c)
	return w
}

func TestDiagramHandler_ConvertToSQL_ValidRequest(t *testing.T) {
	body, _ := json.Marshal(diagramapp.DiagramRequest{
		Tables: []diagramapp.DbTableRequest{
			{
				ID:   "t1",
				Name: "users",
				Columns: []diagramapp.DbColumnRequest{
					{ID: "c1", Name: "id", Type: "uuid", IsPrimaryKey: true},
					{ID: "c2", Name: "email", Type: "text", IsUnique: true},
				},
			},
		},
		Relationships: []diagramapp.RelationshipRequest{},
	})

	w := postJSON(t, newDiagramHandler(), body)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
}

func TestDiagramHandler_ConvertToSQL_InvalidJSON(t *testing.T) {
	w := postJSON(t, newDiagramHandler(), []byte(`{bad json}`))

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestDiagramHandler_ConvertToSQL_MissingRequiredField(t *testing.T) {
	body, _ := json.Marshal(map[string]any{"tables": nil})

	w := postJSON(t, newDiagramHandler(), body)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestDiagramHandler_ConvertToSQL_InvalidColumnType(t *testing.T) {
	body, _ := json.Marshal(diagramapp.DiagramRequest{
		Tables: []diagramapp.DbTableRequest{
			{
				ID:   "t1",
				Name: "users",
				Columns: []diagramapp.DbColumnRequest{
					{ID: "c1", Name: "id", Type: "badtype"},
				},
			},
		},
		Relationships: []diagramapp.RelationshipRequest{},
	})

	w := postJSON(t, newDiagramHandler(), body)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnprocessableEntity)
	}
}
