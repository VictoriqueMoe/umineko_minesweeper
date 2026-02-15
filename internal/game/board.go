package game

import (
	"math/rand"
)

type (
	CellValue int8

	Cell struct {
		X     int       `json:"x"`
		Y     int       `json:"y"`
		Value CellValue `json:"value"`
	}

	Board struct {
		Width  int
		Height int
		Mines  int
		cells  [][]CellValue
		placed bool
		seed   int64
	}
)

const (
	Mine CellValue = -1
)

func NewBoard(width, height, mines int, seed int64) *Board {
	b := &Board{
		Width:  width,
		Height: height,
		Mines:  mines,
		seed:   seed,
	}

	b.cells = make([][]CellValue, height)
	for y := 0; y < height; y++ {
		b.cells[y] = make([]CellValue, width)
	}

	return b
}

func (b *Board) EnsurePlaced(safeX, safeY int) {
	if b.placed {
		return
	}
	b.placed = true
	b.placeMines(safeX, safeY)
	b.calculateAdjacency()
}

func (b *Board) placeMines(safeX, safeY int) {
	rng := rand.New(rand.NewSource(b.seed))

	excluded := make(map[int]bool)
	for dy := -1; dy <= 1; dy++ {
		for dx := -1; dx <= 1; dx++ {
			nx, ny := safeX+dx, safeY+dy
			if nx >= 0 && nx < b.Width && ny >= 0 && ny < b.Height {
				excluded[ny*b.Width+nx] = true
			}
		}
	}

	total := b.Width * b.Height
	var candidates []int
	for i := 0; i < total; i++ {
		if !excluded[i] {
			candidates = append(candidates, i)
		}
	}

	rng.Shuffle(len(candidates), func(i, j int) {
		candidates[i], candidates[j] = candidates[j], candidates[i]
	})

	count := b.Mines
	if count > len(candidates) {
		count = len(candidates)
	}

	for i := 0; i < count; i++ {
		idx := candidates[i]
		y := idx / b.Width
		x := idx % b.Width
		b.cells[y][x] = Mine
	}
}

func (b *Board) calculateAdjacency() {
	for y := 0; y < b.Height; y++ {
		for x := 0; x < b.Width; x++ {
			if b.cells[y][x] == Mine {
				continue
			}
			count := CellValue(0)
			for dy := -1; dy <= 1; dy++ {
				for dx := -1; dx <= 1; dx++ {
					if dy == 0 && dx == 0 {
						continue
					}
					ny, nx := y+dy, x+dx
					if ny >= 0 && ny < b.Height && nx >= 0 && nx < b.Width {
						if b.cells[ny][nx] == Mine {
							count++
						}
					}
				}
			}
			b.cells[y][x] = count
		}
	}
}

func (b *Board) IsMine(x, y int) bool {
	return b.cells[y][x] == Mine
}

func (b *Board) GetValue(x, y int) CellValue {
	return b.cells[y][x]
}

func (b *Board) InBounds(x, y int) bool {
	return x >= 0 && x < b.Width && y >= 0 && y < b.Height
}

func (b *Board) FloodFill(x, y int, revealed [][]bool) []Cell {
	var result []Cell
	stack := []struct{ x, y int }{{x, y}}

	for len(stack) > 0 {
		pos := stack[len(stack)-1]
		stack = stack[:len(stack)-1]

		if !b.InBounds(pos.x, pos.y) {
			continue
		}
		if revealed[pos.y][pos.x] {
			continue
		}
		if b.cells[pos.y][pos.x] == Mine {
			continue
		}

		revealed[pos.y][pos.x] = true
		result = append(result, Cell{
			X:     pos.x,
			Y:     pos.y,
			Value: b.cells[pos.y][pos.x],
		})

		if b.cells[pos.y][pos.x] == 0 {
			for dy := -1; dy <= 1; dy++ {
				for dx := -1; dx <= 1; dx++ {
					if dy == 0 && dx == 0 {
						continue
					}
					stack = append(stack, struct{ x, y int }{pos.x + dx, pos.y + dy})
				}
			}
		}
	}

	return result
}

func (b *Board) TotalSafeCells() int {
	return b.Width*b.Height - b.Mines
}

func (b *Board) GetMinePositions() []Cell {
	var mines []Cell
	for y := 0; y < b.Height; y++ {
		for x := 0; x < b.Width; x++ {
			if b.cells[y][x] == Mine {
				mines = append(mines, Cell{X: x, Y: y, Value: Mine})
			}
		}
	}
	return mines
}
