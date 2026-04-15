ARG GO_VERSION=1.26.1

FROM golang:${GO_VERSION}-alpine AS base
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

FROM base AS dev
RUN go install github.com/air-verse/air@latest
COPY .air.toml ./
COPY . .
CMD ["air"]

FROM base AS builder
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /synaptik-api .

FROM alpine:latest AS production
WORKDIR /root/
COPY --from=builder /synaptik-api .
CMD ["./synaptik-api"]
