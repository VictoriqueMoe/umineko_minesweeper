package ws

import (
	"log"
	"strings"
	"umineko_minesweeper/internal/game"
)

func (h *Hub) handleCreateGame(client *Client, difficulty game.Difficulty, character string) {
	if client.RoomCode != "" {
		h.sendError(client, "already in a game")
		return
	}

	_, code := h.RoomManager.CreateRoom(difficulty)
	token := h.generateToken()
	h.initRoom(client, code, 0, token)
	h.RoomManager.SetPlayerToken(code, 0, token)
	h.RoomManager.SetCharacter(code, 0, character)

	log.Printf("room %s created (difficulty=%s, character=%s)", code, difficulty, character)

	client.SendMessage(OutgoingMessage{
		Type:  MsgGameCreated,
		Code:  code,
		Token: token,
	})
}

func (h *Hub) handleJoinGame(client *Client, code string) {
	if client.RoomCode != "" {
		h.sendError(client, "already in a game")
		return
	}

	code = strings.ToUpper(strings.TrimSpace(code))

	room := h.RoomManager.GetRoom(code)
	if room == nil {
		h.sendError(client, "room not found")
		return
	}
	if room.PlayerCount >= 2 {
		h.sendError(client, "room is full")
		return
	}

	hostChar := h.RoomManager.GetHostCharacter(code)
	h.pendingJoinRoom(client, code)

	log.Printf("player joining room %s (pending character select)", code)

	client.SendMessage(OutgoingMessage{
		Type:          MsgJoinPending,
		Code:          code,
		HostCharacter: hostChar,
	})
}

func (h *Hub) handleSelectCharacter(client *Client, character string) {
	if !client.PendingJoin {
		h.sendError(client, "not in pending join state")
		return
	}

	code := client.RoomCode
	hostChar := h.RoomManager.GetHostCharacter(code)
	if character == hostChar {
		h.sendError(client, "character already taken")
		return
	}

	room, err := h.RoomManager.JoinRoom(code)
	if err != nil {
		h.sendError(client, err.Error())
		return
	}

	token := h.generateToken()
	clients := h.finalizeJoin(client, code, token)
	h.RoomManager.SetPlayerToken(code, 1, token)
	h.RoomManager.SetCharacter(code, 1, character)

	for i := 0; i < len(clients); i++ {
		msg := OutgoingMessage{
			Type:         MsgPlayerJoined,
			PlayerNumber: clients[i].PlayerNumber,
		}
		if clients[i] == client {
			msg.Token = token
		}
		clients[i].SendMessage(msg)
	}

	room.Game.Start()

	log.Printf("room %s game started (characters: %s vs %s)", code, room.Characters[0], room.Characters[1])

	h.broadcast(clients, OutgoingMessage{
		Type:       MsgGameStart,
		Width:      room.Game.Board.Width,
		Height:     room.Game.Board.Height,
		Mines:      room.Game.Board.Mines,
		Characters: room.Characters[:],
	})
}

func (h *Hub) handleReconnect(client *Client, token string) {
	if client.RoomCode != "" {
		h.sendError(client, "already in a game")
		return
	}

	if token == "" {
		h.sendError(client, "no token provided")
		return
	}

	room, code, playerNum := h.RoomManager.FindByToken(token)
	if room == nil {
		h.sendError(client, "session not found")
		return
	}

	clients := h.reconnectToRoom(client, code, playerNum, token)

	client.SendMessage(OutgoingMessage{
		Type:         MsgReconnected,
		Code:         code,
		PlayerNumber: playerNum,
		Width:        room.Game.Board.Width,
		Height:       room.Game.Board.Height,
		Mines:        room.Game.Board.Mines,
		Characters:   room.Characters[:],
	})

	h.sendReconnectState(client, room)

	for i := 0; i < len(clients); i++ {
		if clients[i] != client {
			clients[i].SendMessage(OutgoingMessage{
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

	clients := h.getRoomClients(code)

	for i := 0; i < len(results); i++ {
		h.broadcast(clients, OutgoingMessage{
			Type:   MsgCellsRevealed,
			Player: results[i].Player,
			Cells:  results[i].Cells,
		})

		if results[i].GameOver {
			log.Printf("room %s game over (winner=%d, reason=%s)", code, results[i].Result.Winner, results[i].Result.Reason)
			msg := OutgoingMessage{
				Type:   MsgGameOver,
				Winner: results[i].Result.Winner,
				Loser:  results[i].Result.Loser,
				Reason: string(results[i].Result.Reason),
			}
			if results[i].Result.Reason == game.ReasonMineHit {
				msg.MineCells = room.Game.Board.GetMinePositions()
			}
			h.endGame(code, msg)
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

	h.broadcast(h.getRoomClients(client.RoomCode), OutgoingMessage{
		Type:    MsgCellFlagged,
		Player:  client.PlayerNumber,
		X:       x,
		Y:       y,
		Flagged: *flagged,
	})
}
