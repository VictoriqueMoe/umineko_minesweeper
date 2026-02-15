package main

import (
	"embed"
	"log"

	"umineko_minesweeper/internal/game"
	"umineko_minesweeper/internal/server"
	"umineko_minesweeper/internal/ws"
)

//go:embed static/*
var staticFiles embed.FS

func main() {
	rm := game.NewRoomManager()
	hub := ws.NewHub(rm)
	go hub.Run()

	srv := server.New(hub, staticFiles)
	log.Fatal(srv.Start(":2000"))
}
