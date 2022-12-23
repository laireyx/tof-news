class TofQueue<T> {
  private size: number;
  private items: T[];
  private task: (item: T) => any;

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
      if (this.has(newItem)) return false;

      this.items.push(newItem);
      return true;
    }
  }

  has(item: T) {
    return this.items.includes(item);
  }

  async next() {
    if (this.length > 0) {
      const firstItem = this.items[0];
      await this.task(firstItem);
      this.items.shift();
    }
  }
}

export default TofQueue;
