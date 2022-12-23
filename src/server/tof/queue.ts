class TofQueue<T> {
  private size: number;
  private items: T[];
  private task: (item: T) => any;
  private isRunning = false;

  constructor({ size, task }: { size?: number; task?: (item: T) => any } = {}) {
    this.size = size || 100;
    this.task = task || (() => {});

    this.items = [];
  }

  get length() {
    return this.items.length;
  }

  enqueue(newItem: T) {
    if (this.items.length > this.size) return false;
    else {
      if (this.has(newItem)) {
        if (!this.isRunning) {
          this.isRunning = true;
          this.next();
        }
        return false;
      }

      this.items.push(newItem);
      if (!this.isRunning) {
        this.isRunning = true;
        this.next();
      }
      return true;
    }
  }

  has(item: T) {
    return this.items.includes(item);
  }

  next() {
    if (this.length === 0) {
      this.isRunning = false;
      return;
    }

    console.log("Queue Next!");
    const firstItem = this.items[0];
    this.task(firstItem);
  }

  done() {
    this.items.shift();
    this.next();
  }
}

export default TofQueue;
