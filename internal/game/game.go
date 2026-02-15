package game

import (
	"sync"
)

type (
	GameState int

	GameOverReason string

	PlayerState struct {
		Revealed      [][]bool
		Flagged       [][]bool
		RevealedCount int
	}

	GameResult struct {
		Winner int
		Loser  int
		Reason GameOverReason
	}

	RevealResult struct {
		Cells    []Cell
		GameOver bool
		Result   *GameResult
	}

	Game struct {
		mu      sync.Mutex
		Board   *Board
		State   GameState
		Players [2]*PlayerState
		Code    string
	}
)

const (
	StateWaiting GameState = iota
	StatePlaying
	StateFinished
)

const (
	ReasonMineHit  GameOverReason = "mine_hit"
	ReasonComplete GameOverReason = "completed"
	ReasonForfeit  GameOverReason = "forfeit"
)

func NewGame(code string, width, height, mines int, seed int64) *Game {
	board := NewBoard(width, height, mines, seed)

	g := &Game{
		Board: board,
		State: StateWaiting,
		Code:  code,
	}

	for i := 0; i < 2; i++ {
		g.Players[i] = &PlayerState{
			Revealed: make([][]bool, height),
			Flagged:  make([][]bool, height),
		}
		for y := 0; y < height; y++ {
			g.Players[i].Revealed[y] = make([]bool, width)
			g.Players[i].Flagged[y] = make([]bool, width)
		}
	}

	return g
}

func (g *Game) Start() {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.State = StatePlaying
}

func (g *Game) validateAction(player, x, y int) *PlayerState {
	if g.State != StatePlaying {
		return nil
	}
	if player < 0 || player > 1 {
		return nil
	}
	if !g.Board.InBounds(x, y) {
		return nil
	}

	ps := g.Players[player]
	if ps.Revealed[y][x] {
		return nil
	}
	return ps
}

func (g *Game) Reveal(player, x, y int) *RevealResult {
	g.mu.Lock()
	defer g.mu.Unlock()

	ps := g.validateAction(player, x, y)
	if ps == nil {
		return nil
	}

	if ps.Flagged[y][x] {
		return nil
	}

	g.Board.EnsurePlaced(x, y)

	if g.Board.IsMine(x, y) {
		g.State = StateFinished
		opponent := 1 - player
		return &RevealResult{
			Cells:    []Cell{{X: x, Y: y, Value: Mine}},
			GameOver: true,
			Result: &GameResult{
				Winner: opponent,
				Loser:  player,
				Reason: ReasonMineHit,
			},
		}
	}

	cells := g.Board.FloodFill(x, y, ps.Revealed)
	ps.RevealedCount += len(cells)

	if ps.RevealedCount >= g.Board.TotalSafeCells() {
		g.State = StateFinished
		opponent := 1 - player
		return &RevealResult{
			Cells:    cells,
			GameOver: true,
			Result: &GameResult{
				Winner: player,
				Loser:  opponent,
				Reason: ReasonComplete,
			},
		}
	}

	return &RevealResult{
		Cells:    cells,
		GameOver: false,
	}
}

func (g *Game) Flag(player, x, y int) *bool {
	g.mu.Lock()
	defer g.mu.Unlock()

	ps := g.validateAction(player, x, y)
	if ps == nil {
		return nil
	}

	ps.Flagged[y][x] = !ps.Flagged[y][x]
	flagged := ps.Flagged[y][x]
	return &flagged
}

func (g *Game) GetPlayerCells(player int) []Cell {
	g.mu.Lock()
	defer g.mu.Unlock()

	ps := g.Players[player]
	var cells []Cell
	for y := 0; y < g.Board.Height; y++ {
		for x := 0; x < g.Board.Width; x++ {
			if ps.Revealed[y][x] {
				cells = append(cells, Cell{
					X:     x,
					Y:     y,
					Value: g.Board.GetValue(x, y),
				})
			}
		}
	}
	return cells
}

func (g *Game) GetPlayerFlags(player int) [][2]int {
	g.mu.Lock()
	defer g.mu.Unlock()

	ps := g.Players[player]
	var flags [][2]int
	for y := 0; y < g.Board.Height; y++ {
		for x := 0; x < g.Board.Width; x++ {
			if ps.Flagged[y][x] {
				flags = append(flags, [2]int{x, y})
			}
		}
	}
	return flags
}

func (g *Game) Forfeit(player int) *GameResult {
	g.mu.Lock()
	defer g.mu.Unlock()

	if g.State != StatePlaying {
		return nil
	}

	g.State = StateFinished
	opponent := 1 - player
	return &GameResult{
		Winner: opponent,
		Loser:  player,
		Reason: ReasonForfeit,
	}
}
