package response_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
	"github.com/luneto10/synaptik/backend/internal/infrastructure/http/gin/response"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newContext() (*gin.Context, *httptest.ResponseRecorder) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	return c, w
}

func decodeBody(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode response body: %v", err)
	}
	return body
}

func TestOK(t *testing.T) {
	c, w := newContext()
	response.OK(c, "all good", "payload")

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}
	body := decodeBody(t, w)
	if body["success"] != true {
		t.Errorf("success = %v, want true", body["success"])
	}
	if body["message"] != "all good" {
		t.Errorf("message = %v, want %q", body["message"], "all good")
	}
}

func TestCreated(t *testing.T) {
	c, w := newContext()
	response.Created(c, "created", "item")

	if w.Code != http.StatusCreated {
		t.Errorf("status = %d, want %d", w.Code, http.StatusCreated)
	}
}

func TestNoContent(t *testing.T) {
	c, w := newContext()
	response.NoContent(c)

	if w.Code != http.StatusNoContent {
		t.Errorf("status = %d, want %d", w.Code, http.StatusNoContent)
	}
}

func TestFail(t *testing.T) {
	c, w := newContext()
	response.Fail(c, http.StatusBadRequest, "bad input")

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
	body := decodeBody(t, w)
	if body["success"] != false {
		t.Errorf("success = %v, want false", body["success"])
	}
}

func TestDomainError(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
	}{
		{"not found", fmt.Errorf("diagram not found: %w", apperrors.ErrNotFound), http.StatusNotFound},
		{"conflict", fmt.Errorf("already exists: %w", apperrors.ErrConflict), http.StatusConflict},
		{"unauthorized", fmt.Errorf("access denied: %w", apperrors.ErrUnauthorized), http.StatusUnauthorized},
		{"invalid", fmt.Errorf("bad column: %w", apperrors.ErrInvalid), http.StatusUnprocessableEntity},
		{"unknown", fmt.Errorf("some internal error"), http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, w := newContext()
			response.DomainError(c, tt.err)
			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tt.wantStatus)
			}
		})
	}
}
