package ws

import (
	"log"
	"umineko_minesweeper/internal/game"
)

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
			h.removeRoomLocked(code)
			log.Printf("room %s removed (game finished, empty)", code)
		}
		return
	}

	if room.Game.State == game.StateWaiting {
		h.handleWaitingDisconnect(code, remaining)
		return
	}

	if len(remaining) == 0 {
		h.startBothDisconnectedTimer(client, code)
		return
	}

	h.startForfeitTimer(client, code, remaining)
}

func (h *Hub) handleWaitingDisconnect(code string, remaining []*Client) {
	for i := 0; i < len(remaining); i++ {
		if remaining[i].PendingJoin {
			h.sendError(remaining[i], "host left the room")
			remaining[i].RoomCode = ""
			remaining[i].PendingJoin = false
		}
	}
	hasRealPlayer := false
	for i := 0; i < len(remaining); i++ {
		if !remaining[i].PendingJoin {
			hasRealPlayer = true
			break
		}
	}
	if !hasRealPlayer {
		h.removeRoomLocked(code)
		log.Printf("room %s removed (waiting, host left)", code)
	}
}

func (h *Hub) startBothDisconnectedTimer(client *Client, code string) {
	otherPlayer := 1 - client.PlayerNumber
	h.cancelTimerLocked(code + ":" + string(rune('0'+otherPlayer)))

	h.startTimerLocked(code+":both", -1, code, func() {
		h.removeRoomLocked(code)
		log.Printf("room %s removed (both players disconnected)", code)
	})
	log.Printf("both players disconnected from room %s, waiting %v", code, disconnectTimeout)
}

func (h *Hub) startForfeitTimer(client *Client, code string, remaining []*Client) {
	timerKey := code + ":" + string(rune('0'+client.PlayerNumber))

	h.broadcast(remaining, OutgoingMessage{
		Type:      MsgOpponentDisconnected,
		Countdown: int(disconnectTimeout.Seconds()),
	})

	h.startTimerLocked(timerKey, client.PlayerNumber, code, func() {
		currentRoom := h.RoomManager.GetRoom(code)
		if currentRoom == nil {
			return
		}
		result := currentRoom.Game.Forfeit(client.PlayerNumber)
		if result == nil {
			return
		}
		h.endGameLocked(code, OutgoingMessage{
			Type:   MsgGameOver,
			Winner: result.Winner,
			Loser:  result.Loser,
			Reason: string(result.Reason),
		})
		log.Printf("player %d forfeited room %s (disconnect timeout)", client.PlayerNumber, code)
	})

	log.Printf("player %d disconnected from room %s, waiting %v for reconnect", client.PlayerNumber, code, disconnectTimeout)
}
