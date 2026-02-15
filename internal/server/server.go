package server

import (
	"embed"
	"io/fs"
	"log"
	"net/http"

	"github.com/gorilla/websocket"

	"umineko_minesweeper/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Server struct {
	hub      *ws.Hub
	staticFS embed.FS
}

func New(hub *ws.Hub, staticFS embed.FS) *Server {
	return &Server{hub: hub, staticFS: staticFS}
}

func (s *Server) Start(addr string) error {
	mux := http.NewServeMux()

	mux.HandleFunc("/ws", s.handleWebSocket)

	sub, _ := fs.Sub(s.staticFS, "static")
	mux.Handle("/", http.FileServer(http.FS(sub)))

	log.Printf("server starting on http://localhost%s", addr)
	return http.ListenAndServe(addr, mux)
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade error: %v", err)
		return
	}

	client := ws.NewClient(s.hub, conn)
	s.hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}
