# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -tags timetzdata -ldflags="-s -w" -o /out/server .

# Runtime stage
FROM alpine:3.22
# alpine already ships CA certs and busybox wget (used by the compose healthcheck)
RUN adduser -D -u 1001 app
WORKDIR /app
COPY --from=builder /out/server ./server
USER app
EXPOSE 8080
CMD ["./server"]
