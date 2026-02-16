package ws

import "umineko_minesweeper/internal/game"

type (
	MessageType string

	IncomingMessage struct {
		Type       MessageType     `json:"type"`
		Code       string          `json:"code,omitempty"`
		Token      string          `json:"token,omitempty"`
		Difficulty game.Difficulty `json:"difficulty,omitempty"`
		Character  string          `json:"character,omitempty"`
		X          int             `json:"x"`
		Y          int             `json:"y"`
	}

	FlagData struct {
		X int `json:"x"`
		Y int `json:"y"`
	}

	OutgoingMessage struct {
		Type          MessageType `json:"type"`
		Code          string      `json:"code,omitempty"`
		Token         string      `json:"token,omitempty"`
		PlayerNumber  int         `json:"playerNumber"`
		Width         int         `json:"width"`
		Height        int         `json:"height"`
		Mines         int         `json:"mines"`
		Player        int         `json:"player"`
		Cells         []game.Cell `json:"cells,omitempty"`
		Flags         []FlagData  `json:"flags,omitempty"`
		X             int         `json:"x"`
		Y             int         `json:"y"`
		Flagged       bool        `json:"flagged"`
		Winner        int         `json:"winner"`
		Loser         int         `json:"loser"`
		Reason        string      `json:"reason,omitempty"`
		Message       string      `json:"message,omitempty"`
		Countdown     int         `json:"countdown"`
		MineCells     []game.Cell `json:"mineCells,omitempty"`
		Characters    []string    `json:"characters,omitempty"`
		HostCharacter string      `json:"hostCharacter,omitempty"`
	}
)

const (
	MsgCreateGame           MessageType = "create_game"
	MsgJoinGame             MessageType = "join_game"
	MsgReconnect            MessageType = "reconnect"
	MsgReveal               MessageType = "reveal"
	MsgFlag                 MessageType = "flag"
	MsgJoinPending          MessageType = "join_pending"
	MsgSelectCharacter      MessageType = "select_character"
	MsgGameCreated          MessageType = "game_created"
	MsgPlayerJoined         MessageType = "player_joined"
	MsgGameStart            MessageType = "game_start"
	MsgCellsRevealed        MessageType = "cells_revealed"
	MsgCellFlagged          MessageType = "cell_flagged"
	MsgGameOver             MessageType = "game_over"
	MsgOpponentDisconnected MessageType = "opponent_disconnected"
	MsgOpponentReconnected  MessageType = "opponent_reconnected"
	MsgReconnected          MessageType = "reconnected"
	MsgError                MessageType = "error"
)
