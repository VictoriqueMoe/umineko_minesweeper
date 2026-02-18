package ws

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"sync"
	"time"
	"umineko_minesweeper/internal/game"
)

const disconnectTimeout = 10 * time.Second

type (
	disconnectTimer struct {
		timer      *time.Timer
		playerNum  int
		roomCode   string
		cancelChan chan struct{}
	}

	Hub struct {
		mu               sync.RWMutex
		clients          map[*Client]bool
		rooms            map[string][]*Client
		disconnectTimers map[string]*disconnectTimer
		RoomManager      *game.RoomManager
		Register         chan *Client
		Unregister       chan *Client
	}
)

func NewHub(rm *game.RoomManager) *Hub {
	return &Hub{
		clients:          make(map[*Client]bool),
		rooms:            make(map[string][]*Client),
		disconnectTimers: make(map[string]*disconnectTimer),
		RoomManager:      rm,
		Register:         make(chan *Client),
		Unregister:       make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)
		case client := <-h.Unregister:
			h.unregisterClient(client)
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client] = true
	log.Printf("client connected (total=%d)", len(h.clients))
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	defer func() {
		if r := recover(); r != nil {
			log.Printf("panic in unregisterClient: %v", r)
		}
	}()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.Send)
		log.Printf("client disconnected (total=%d, room=%s)", len(h.clients), client.RoomCode)
		h.handleDisconnect(client)
	}
}

func (h *Hub) HandleMessage(client *Client, msg *IncomingMessage) {
	switch msg.Type {
	case MsgCreateGame:
		h.handleCreateGame(client, msg.Difficulty, msg.Character)
	case MsgJoinGame:
		h.handleJoinGame(client, msg.Code)
	case MsgSelectCharacter:
		h.handleSelectCharacter(client, msg.Character)
	case MsgReconnect:
		h.handleReconnect(client, msg.Token)
	case MsgReveal:
		h.handleReveal(client, msg.X, msg.Y)
	case MsgFlag:
		h.handleFlag(client, msg.X, msg.Y)
	default:
		h.sendError(client, "unknown message type")
	}
}

func (h *Hub) getRoomClients(code string) []*Client {
	h.mu.RLock()
	defer h.mu.RUnlock()
	src := h.rooms[code]
	dst := make([]*Client, len(src))
	copy(dst, src)
	return dst
}

func (h *Hub) initRoom(client *Client, code string, playerNum int, token string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	client.RoomCode = code
	client.PlayerNumber = playerNum
	client.Token = token
	h.rooms[code] = []*Client{client}
}

func (h *Hub) pendingJoinRoom(client *Client, code string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	client.RoomCode = code
	client.PendingJoin = true
	h.rooms[code] = append(h.rooms[code], client)
}

func (h *Hub) finalizeJoin(client *Client, code string, token string) []*Client {
	h.mu.Lock()
	defer h.mu.Unlock()
	client.PlayerNumber = 1
	client.Token = token
	client.PendingJoin = false
	src := h.rooms[code]
	dst := make([]*Client, len(src))
	copy(dst, src)
	return dst
}

func (h *Hub) reconnectToRoom(client *Client, code string, playerNum int, token string) []*Client {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.cancelTimerLocked(code + ":" + string(rune('0'+playerNum)))
	h.cancelTimerLocked(code + ":both")
	client.RoomCode = code
	client.PlayerNumber = playerNum
	client.Token = token
	h.rooms[code] = append(h.rooms[code], client)
	src := h.rooms[code]
	dst := make([]*Client, len(src))
	copy(dst, src)
	return dst
}

func (h *Hub) endGame(code string, msg OutgoingMessage) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.endGameLocked(code, msg)
}

func (h *Hub) cancelTimerLocked(key string) {
	if dt, exists := h.disconnectTimers[key]; exists {
		dt.timer.Stop()
		close(dt.cancelChan)
		delete(h.disconnectTimers, key)
		log.Printf("cancelled disconnect timer %s", key)
	}
}

func (h *Hub) removeRoomLocked(code string) {
	delete(h.rooms, code)
	h.RoomManager.RemoveRoom(code)
}

func (h *Hub) endGameLocked(code string, msg OutgoingMessage) {
	if clients, ok := h.rooms[code]; ok {
		for i := 0; i < len(clients); i++ {
			clients[i].SendMessage(msg)
			clients[i].RoomCode = ""
			clients[i].Token = ""
		}
	}
	h.removeRoomLocked(code)
}

func (h *Hub) startTimerLocked(key string, playerNum int, code string, fn func()) {
	cancelChan := make(chan struct{})
	timer := time.AfterFunc(disconnectTimeout, func() {
		h.mu.Lock()
		defer h.mu.Unlock()

		select {
		case <-cancelChan:
			return
		default:
		}

		delete(h.disconnectTimers, key)
		fn()
	})
	h.disconnectTimers[key] = &disconnectTimer{
		timer:      timer,
		playerNum:  playerNum,
		roomCode:   code,
		cancelChan: cancelChan,
	}
}

func (h *Hub) sendReconnectState(client *Client, room *game.Room) {
	for p := 0; p < 2; p++ {
		cells := room.Game.GetPlayerCells(p)
		if len(cells) > 0 {
			client.SendMessage(OutgoingMessage{
				Type:   MsgCellsRevealed,
				Player: p,
				Cells:  cells,
			})
		}

		gameFlags := room.Game.GetPlayerFlags(p)
		for i := 0; i < len(gameFlags); i++ {
			client.SendMessage(OutgoingMessage{
				Type:    MsgCellFlagged,
				Player:  p,
				X:       gameFlags[i][0],
				Y:       gameFlags[i][1],
				Flagged: true,
			})
		}
	}
}

func (h *Hub) generateToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		log.Printf("generateToken: crypto/rand.Read failed: %v", err)
		return ""
	}
	return hex.EncodeToString(b)
}

func (h *Hub) sendError(client *Client, message string) {
	client.SendMessage(OutgoingMessage{
		Type:    MsgError,
		Message: message,
	})
}

func (h *Hub) broadcast(clients []*Client, msg OutgoingMessage) {
	for i := 0; i < len(clients); i++ {
		clients[i].SendMessage(msg)
	}
}
