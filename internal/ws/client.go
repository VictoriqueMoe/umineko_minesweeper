package ws

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait         = 10 * time.Second
	pongWait          = 30 * time.Second
	pingPeriod        = (pongWait * 9) / 10
	maxMessageSize    = 512
	unregisterTimeout = 5 * time.Second
)

type Client struct {
	Hub          *Hub
	Conn         *websocket.Conn
	Send         chan []byte
	RoomCode     string
	PlayerNumber int
	Token        string
	PendingJoin  bool
}

func NewClient(hub *Hub, conn *websocket.Conn) *Client {
	return &Client{
		Hub:          hub,
		Conn:         conn,
		Send:         make(chan []byte, 256),
		PlayerNumber: -1,
	}
}

func (c *Client) ReadPump() {
	defer func() {
		timer := time.NewTimer(unregisterTimeout)
		defer timer.Stop()

		select {
		case c.Hub.Unregister <- c:
		case <-timer.C:
			log.Printf("unregister channel blocked for %v, forcing connection close", unregisterTimeout)
		}

		if err := c.Conn.Close(); err != nil {
			log.Printf("websocket close error (readpump): %v", err)
		}
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	if err := c.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		log.Printf("initial SetReadDeadline error: %v", err)
		return
	}
	c.Conn.SetPongHandler(func(string) error {
		if err := c.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
			log.Printf("SetReadDeadline error (pong): %v", err)
			return err
		}
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("websocket error: %v", err)
			}
			break
		}

		var msg IncomingMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			c.SendMessage(OutgoingMessage{
				Type:    MsgError,
				Message: "invalid message format",
			})
			continue
		}

		c.Hub.HandleMessage(c, &msg)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		if err := c.Conn.Close(); err != nil {
			log.Printf("websocket close error (writepump): %v", err)
		}
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				log.Printf("SetWriteDeadline error: %v", err)
				return
			}
			if !ok {
				if err := c.Conn.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					log.Printf("WriteCloseMessage error: %v", err)
				}
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				log.Printf("NextWriter error: %v", err)
				return
			}
			if _, err := w.Write(message); err != nil {
				log.Printf("writer write error: %v", err)
				_ = w.Close()
				return
			}
			if err := w.Close(); err != nil {
				log.Printf("writer close error: %v", err)
				return
			}

		case <-ticker.C:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				log.Printf("SetWriteDeadline error: %v", err)
				return
			}
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("write ping error: %v", err)
				return
			}
		}
	}
}

func (c *Client) SendMessage(msg OutgoingMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("marshal error: %v", err)
		return
	}
	select {
	case c.Send <- data:
	default:
		log.Printf("client send buffer full, dropping message")
	}
}
