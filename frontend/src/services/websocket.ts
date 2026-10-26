/**
 * WebSocket Real-Time Client for MedTree X.
 * Connects to live hospital flow event hub with automatic reconnection
 * and graceful fallback.
 */

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
}

type EventCallback = (event: WebSocketEvent) => void;
type StatusCallback = (connected: boolean) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: EventCallback[] = [];
  private statusListeners: StatusCallback[] = [];
  private isConnected = false;
  private reconnectTimer: any = null;
  private pingTimer: any = null;

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.port === '5173' ? 'localhost:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.notifyStatus(true);
        // Ping every 25 seconds
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'PING' }));
          }
        }, 25000);
      };

      this.socket.onmessage = (event) => {
        try {
          const payload: WebSocketEvent = JSON.parse(event.data);
          this.listeners.forEach((cb) => {
            try {
              cb(payload);
            } catch (err) {
              console.error('Error in WS subscriber:', err);
            }
          });
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.notifyStatus(false);
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        this.notifyStatus(false);
      };
    } catch (err) {
      this.isConnected = false;
      this.notifyStatus(false);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((cb) => cb(connected));
  }

  public subscribe(callback: EventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.push(callback);
    callback(this.isConnected);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  public getStatus(): boolean {
    return this.isConnected;
  }
}

export const wsClient = new WebSocketClient();
