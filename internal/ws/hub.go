package ws

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"strings"
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
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				h.handleDisconnect(client)
			}
			h.mu.Unlock()
		}
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
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: "unknown message type",
		})
	}
}

func generateToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (h *Hub) handleCreateGame(client *Client, difficulty game.Difficulty, character string) {
	if client.RoomCode != "" {
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: "already in a game",
		})
		return
	}

	_, code := h.RoomManager.CreateRoom(difficulty)
	token := generateToken()

	h.mu.Lock()
	client.RoomCode = code
	client.PlayerNumber = 0
	client.Token = token
	h.rooms[code] = []*Client{client}
	h.mu.Unlock()

	h.RoomManager.SetPlayerToken(code, 0, token)
	h.RoomManager.SetCharacter(code, 0, character)

	client.SendMessage(OutgoingMessage{
		Type:  MsgGameCreated,
		Code:  code,
		Token: token,
	})
}

func (h *Hub) handleJoinGame(client *Client, code string) {
	if client.RoomCode != "" {
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: "already in a game",
		})
		return
	}

	code = strings.ToUpper(strings.TrimSpace(code))

	room := h.RoomManager.GetRoom(code)
	if room == nil {
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: "room not found",
		})
		return
	}
	if room.PlayerCount >= 2 {
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: "room is full",
		})
		return
	}

	hostChar := h.RoomManager.GetHostCharacter(code)

	h.mu.Lock()
	client.RoomCode = code
	client.PendingJoin = true
	h.rooms[code] = append(h.rooms[code], client)
	h.mu.Unlock()

	client.SendMessage(OutgoingMessage{
		Type:          MsgJoinPending,
		Code:          code,
		HostCharacter: hostChar,
	})
}

func (h *Hub) handleSelectCharacter(client *Client, character string) {
	if !client.PendingJoin {
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: "not in pending join state",
		})
		return
	}

	code := client.RoomCode
	hostChar := h.RoomManager.GetHostCharacter(code)
	if character == hostChar {
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: "character already taken",
		})
		return
	}

	room, err := h.RoomManager.JoinRoom(code)
	if err != nil {
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: err.Error(),
		})
		return
	}

	token := generateToken()

	h.mu.Lock()
	client.PlayerNumber = 1
	client.Token = token
	client.PendingJoin = false
	clients := make([]*Client, len(h.rooms[code]))
	copy(clients, h.rooms[code])
	h.mu.Unlock()

	h.RoomManager.SetPlayerToken(code, 1, token)
	h.RoomManager.SetCharacter(code, 1, character)

	for _, c := range clients {
		msg := OutgoingMessage{
			Type:         MsgPlayerJoined,
			PlayerNumber: c.PlayerNumber,
		}
		if c == client {
			msg.Token = token
		}
		c.SendMessage(msg)
	}

	room.Game.Start()

	for _, c := range clients {
		c.SendMessage(OutgoingMessage{
			Type:       MsgGameStart,
			Width:      room.Game.Board.Width,
			Height:     room.Game.Board.Height,
			Mines:      room.Game.Board.Mines,
			Characters: room.Characters[:],
		})
	}
}

func (h *Hub) handleReconnect(client *Client, token string) {
	if client.RoomCode != "" {
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: "already in a game",
		})
		return
	}

	if token == "" {
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: "no token provided",
		})
		return
	}

	room, code, playerNum := h.RoomManager.FindByToken(token)
	if room == nil {
		client.SendMessage(OutgoingMessage{
			Type:    MsgError,
			Message: "session not found",
		})
		return
	}

	timerKey := code + ":" + string(rune('0'+playerNum))
	h.mu.Lock()
	if dt, exists := h.disconnectTimers[timerKey]; exists {
		dt.timer.Stop()
		close(dt.cancelChan)
		delete(h.disconnectTimers, timerKey)
	}

	client.RoomCode = code
	client.PlayerNumber = playerNum
	client.Token = token
	h.rooms[code] = append(h.rooms[code], client)
	clients := make([]*Client, len(h.rooms[code]))
	copy(clients, h.rooms[code])
	h.mu.Unlock()

	client.SendMessage(OutgoingMessage{
		Type:         MsgReconnected,
		Code:         code,
		PlayerNumber: playerNum,
		Width:        room.Game.Board.Width,
		Height:       room.Game.Board.Height,
		Mines:        room.Game.Board.Mines,
		Characters:   room.Characters[:],
	})

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

	for _, c := range clients {
		if c != client {
			c.SendMessage(OutgoingMessage{
				Type: MsgOpponentReconnected,
			})
		}
	}

	log.Printf("player %d reconnected to room %s", playerNum, code)
}

func (h *Hub) handleReveal(client *Client, x, y int) {
	if client.RoomCode == "" {
		return
	}

	code := client.RoomCode
	room := h.RoomManager.GetRoom(code)
	if room == nil {
		return
	}

	results := room.Game.Reveal(client.PlayerNumber, x, y)
	if len(results) == 0 {
		if !room.Game.Board.IsPlaced() {
			client.SendMessage(OutgoingMessage{
				Type: MsgFirstClickPending,
				X:    x,
				Y:    y,
			})
		}
		return
	}

	h.mu.RLock()
	clients := h.rooms[code]
	h.mu.RUnlock()

	for _, result := range results {
		for _, c := range clients {
			c.SendMessage(OutgoingMessage{
				Type:   MsgCellsRevealed,
				Player: result.Player,
				Cells:  result.Cells,
			})
		}

		if result.GameOver {
			msg := OutgoingMessage{
				Type:   MsgGameOver,
				Winner: result.Result.Winner,
				Loser:  result.Result.Loser,
				Reason: string(result.Result.Reason),
			}
			if result.Result.Reason == game.ReasonMineHit {
				msg.MineCells = room.Game.Board.GetMinePositions()
			}
			for _, c := range clients {
				c.SendMessage(msg)
				c.RoomCode = ""
				c.Token = ""
			}
			h.mu.Lock()
			delete(h.rooms, code)
			h.RoomManager.RemoveRoom(code)
			h.mu.Unlock()
			return
		}
	}
}

func (h *Hub) handleFlag(client *Client, x, y int) {
	if client.RoomCode == "" {
		return
	}

	room := h.RoomManager.GetRoom(client.RoomCode)
	if room == nil {
		return
	}

	flagged := room.Game.Flag(client.PlayerNumber, x, y)
	if flagged == nil {
		return
	}

	h.mu.RLock()
	clients := h.rooms[client.RoomCode]
	h.mu.RUnlock()

	for _, c := range clients {
		c.SendMessage(OutgoingMessage{
			Type:    MsgCellFlagged,
			Player:  client.PlayerNumber,
			X:       x,
			Y:       y,
			Flagged: *flagged,
		})
	}
}

func (h *Hub) handleDisconnect(client *Client) {
	if client.RoomCode == "" {
		return
	}

	code := client.RoomCode
	clients, exists := h.rooms[code]
	if !exists {
		return
	}

	var remaining []*Client
	for i := 0; i < len(clients); i++ {
		if clients[i] != client {
			remaining = append(remaining, clients[i])
		}
	}
	h.rooms[code] = remaining

	room := h.RoomManager.GetRoom(code)
	if room == nil {
		delete(h.rooms, code)
		return
	}

	if client.PendingJoin {
		return
	}

	if room.Game.State == game.StateFinished {
		if len(remaining) == 0 {
			delete(h.rooms, code)
			h.RoomManager.RemoveRoom(code)
			log.Printf("room %s removed (game finished, empty)", code)
		}
		return
	}

	if room.Game.State == game.StateWaiting {
		for _, c := range remaining {
			if c.PendingJoin {
				c.SendMessage(OutgoingMessage{
					Type:    MsgError,
					Message: "host left the room",
				})
				c.RoomCode = ""
				c.PendingJoin = false
			}
		}
		hasRealPlayer := false
		for _, c := range remaining {
			if !c.PendingJoin {
				hasRealPlayer = true
				break
			}
		}
		if !hasRealPlayer {
			delete(h.rooms, code)
			h.RoomManager.RemoveRoom(code)
			log.Printf("room %s removed (waiting, host left)", code)
		}
		return
	}

	if len(remaining) == 0 {
		timerKey := code + ":both"
		cancelChan := make(chan struct{})
		timer := time.AfterFunc(disconnectTimeout, func() {
			h.mu.Lock()
			defer h.mu.Unlock()
			if _, cancelled := <-cancelChan; !cancelled {
				delete(h.disconnectTimers, timerKey)
				delete(h.rooms, code)
				h.RoomManager.RemoveRoom(code)
				log.Printf("room %s removed (both players disconnected)", code)
			}
		})
		h.disconnectTimers[timerKey] = &disconnectTimer{
			timer:      timer,
			playerNum:  -1,
			roomCode:   code,
			cancelChan: cancelChan,
		}
		log.Printf("both players disconnected from room %s, waiting %v", code, disconnectTimeout)
		return
	}

	timerKey := code + ":" + string(rune('0'+client.PlayerNumber))
	cancelChan := make(chan struct{})

	for _, c := range remaining {
		c.SendMessage(OutgoingMessage{
			Type:      MsgOpponentDisconnected,
			Countdown: int(disconnectTimeout.Seconds()),
		})
	}

	timer := time.AfterFunc(disconnectTimeout, func() {
		h.mu.Lock()
		defer h.mu.Unlock()

		delete(h.disconnectTimers, timerKey)

		select {
		case <-cancelChan:
			return
		default:
		}

		currentRoom := h.RoomManager.GetRoom(code)
		if currentRoom == nil {
			return
		}

		result := currentRoom.Game.Forfeit(client.PlayerNumber)
		if result == nil {
			return
		}

		if currentClients, ok := h.rooms[code]; ok {
			for _, c := range currentClients {
				c.SendMessage(OutgoingMessage{
					Type:   MsgGameOver,
					Winner: result.Winner,
					Loser:  result.Loser,
					Reason: string(result.Reason),
				})
				c.RoomCode = ""
				c.Token = ""
			}
		}
		delete(h.rooms, code)
		h.RoomManager.RemoveRoom(code)

		log.Printf("player %d forfeited room %s (disconnect timeout)", client.PlayerNumber, code)
	})

	h.disconnectTimers[timerKey] = &disconnectTimer{
		timer:      timer,
		playerNum:  client.PlayerNumber,
		roomCode:   code,
		cancelChan: cancelChan,
	}

	log.Printf("player %d disconnected from room %s, waiting %v for reconnect", client.PlayerNumber, code, disconnectTimeout)
}
