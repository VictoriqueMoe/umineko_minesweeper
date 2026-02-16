package game

import (
	"crypto/rand"
	"fmt"
	"math/big"
	mathrand "math/rand"
	"sync"
	"time"
)

type Difficulty string

const (
	Easy   Difficulty = "easy"
	Medium Difficulty = "medium"
	Hard   Difficulty = "hard"

	CodeLength = 6
)

type difficultyConfig struct {
	Width  int
	Height int
	Mines  int
}

var difficulties = map[Difficulty]difficultyConfig{
	Easy:   {Width: 9, Height: 9, Mines: 10},
	Medium: {Width: 16, Height: 16, Mines: 40},
	Hard:   {Width: 30, Height: 16, Mines: 99},
}

func GetDifficultyConfig(d Difficulty) (int, int, int) {
	cfg, ok := difficulties[d]
	if !ok {
		cfg = difficulties[Medium]
	}
	return cfg.Width, cfg.Height, cfg.Mines
}

type (
	Room struct {
		Game         *Game
		PlayerCount  int
		PlayerTokens [2]string
		Characters   [2]string
	}

	RoomManager struct {
		mu    sync.RWMutex
		rooms map[string]*Room
	}
)

func NewRoomManager() *RoomManager {
	return &RoomManager{
		rooms: make(map[string]*Room),
	}
}

func (rm *RoomManager) CreateRoom(difficulty Difficulty) (*Room, string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	code := rm.generateCode()
	seed := time.Now().UnixNano()
	width, height, mines := GetDifficultyConfig(difficulty)
	game := NewGame(code, width, height, mines, seed)

	room := &Room{
		Game:        game,
		PlayerCount: 1,
	}
	rm.rooms[code] = room

	return room, code
}

func (rm *RoomManager) JoinRoom(code string) (*Room, error) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	room, exists := rm.rooms[code]
	if !exists {
		return nil, fmt.Errorf("room not found")
	}
	if room.PlayerCount >= 2 {
		return nil, fmt.Errorf("room is full")
	}

	room.PlayerCount++
	return room, nil
}

func (rm *RoomManager) GetRoom(code string) *Room {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return rm.rooms[code]
}

func (rm *RoomManager) RemoveRoom(code string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	delete(rm.rooms, code)
}

func (rm *RoomManager) FindByToken(token string) (*Room, string, int) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	for code, room := range rm.rooms {
		for i := 0; i < 2; i++ {
			if room.PlayerTokens[i] == token {
				return room, code, i
			}
		}
	}
	return nil, "", -1
}

func (rm *RoomManager) SetPlayerToken(code string, player int, token string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	if room, exists := rm.rooms[code]; exists {
		room.PlayerTokens[player] = token
	}
}

func (rm *RoomManager) SetCharacter(code string, player int, character string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	if room, exists := rm.rooms[code]; exists {
		room.Characters[player] = character
	}
}

func (rm *RoomManager) GetHostCharacter(code string) string {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	if room, exists := rm.rooms[code]; exists {
		return room.Characters[0]
	}
	return ""
}

func (rm *RoomManager) generateCode() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	for {
		code := make([]byte, CodeLength)
		for i := 0; i < CodeLength; i++ {
			n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
			if err != nil {
				code[i] = charset[mathrand.Intn(len(charset))]
			} else {
				code[i] = charset[n.Int64()]
			}
		}
		codeStr := string(code)
		if _, exists := rm.rooms[codeStr]; !exists {
			return codeStr
		}
	}
}
