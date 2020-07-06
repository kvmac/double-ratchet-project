FROM golang:alpine as builder

# ENV GO111MODULE=on

LABEL maintainer="Kodee McIntosh <kodee.mcintosh@gmail.com>"

# Git is required for fetching the dependencies.
RUN apk update && apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./

# install service dependencies
RUN go mod download 

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/main .
# COPY --from=builder /app/.env .       

EXPOSE 8080

CMD ["./main"]
