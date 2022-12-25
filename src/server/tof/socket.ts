import net from "node:net";

type ListenerCallback = (...args: any[]) => void;

export default class TofSocket {
  private connectOpts: net.NetConnectOpts;
  private isReady = false;
  private _socket: net.Socket;
  private _listeners: Map<string, ListenerCallback[]> = new Map();

  constructor(
    connectOpts: net.NetConnectOpts = {
      host: "8.213.130.139",
      port: 30031,
      timeout: 5000,
    }
  ) {
    this.connectOpts = connectOpts;
    this._socket = this.initSocket();
  }

  private invalidateSocket() {
    if (!this._socket.readableEnded) this._socket.end();

    if (this.isReady) {
      console.log("Connection lost");
      this.isReady = false;
    }
    // this._socket = this.initSocket();
    // this._socket.emit("reconnect");
  }

  private initSocket(): net.Socket {
    const socket = net.connect(this.connectOpts);

    console.log("New connection");
    // Invalidate if error
    socket.on("error", (err) => {
      console.error(err);
      this.invalidateSocket();
    });
    socket.on("timeout", () => this.invalidateSocket());
    socket.on("end", () => this.invalidateSocket());
    socket.on("close", () => this.invalidateSocket());

    // Reinstall all listeners
    [...this._listeners.entries()].forEach(([event, eventListeners]) => {
      eventListeners.forEach((listener) => {
        socket.on(event, listener);
      });
    });

    this.isReady = true;
    return socket;
  }

  get socket() {
    if (!this.isReady) {
      this._socket = this.initSocket();
    }
    return this._socket;
  }

  on(event: string, listener: ListenerCallback) {
    const eventListeners = this._listeners.get(event) ?? [];

    this.socket.on(event, listener);
    eventListeners.push(listener);

    this._listeners.set(event, eventListeners);
  }

  send(msg: Buffer): Promise<Error | null> {
    return new Promise((resolve, reject) => {
      this.socket.write(msg, (error) => {
        if (error) reject(error);

        resolve(null);
      });
    });
  }

  recv() {
    const chunks: Buffer[] = [];
    let chunk;

    while ((chunk = this.socket.read())) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }
}
