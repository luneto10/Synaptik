package response

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/luneto10/synaptik/backend/internal/domain/apperrors"
)

// BaseApiResponse is the standard envelope for every API response.
//
// Success: {"success": true,  "message": "...", "data": {...}}
// Error:   {"success": false, "message": "...", "data": null}
type BaseApiResponse[T any] struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    T      `json:"data"`
}

// OK sends a 200 response with data.
func OK[T any](c *gin.Context, message string, data T) {
	c.JSON(http.StatusOK, BaseApiResponse[T]{Success: true, Message: message, Data: data})
}

// Created sends a 201 response with data.
func Created[T any](c *gin.Context, message string, data T) {
	c.JSON(http.StatusCreated, BaseApiResponse[T]{Success: true, Message: message, Data: data})
}

// NoContent sends a 204 response with no body.
func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// Fail sends an error response with data set to nil.
func Fail(c *gin.Context, status int, message string) {
	c.JSON(status, BaseApiResponse[any]{Success: false, Message: message, Data: nil})
}

// DomainError maps domain sentinel errors to the appropriate HTTP status.
// Domain errors must wrap apperrors sentinels with %w for this to work.
func DomainError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, apperrors.ErrNotFound):
		Fail(c, http.StatusNotFound, err.Error())
	case errors.Is(err, apperrors.ErrConflict):
		Fail(c, http.StatusConflict, err.Error())
	case errors.Is(err, apperrors.ErrUnauthorized):
		Fail(c, http.StatusUnauthorized, err.Error())
	case errors.Is(err, apperrors.ErrInvalid):
		Fail(c, http.StatusUnprocessableEntity, err.Error())
	default:
		Fail(c, http.StatusInternalServerError, "internal server error")
	}
}
