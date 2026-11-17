// Binary min-heap of (key, item) with a total order: key first, then item. Deterministic.
export class Heap {
  keys: number[] = []; tiles: number[] = [];
  get size() { return this.keys.length; }
  push(key: number, tile: number) {
    const k = this.keys, t = this.tiles;
    let i = k.length; k.push(key); t.push(tile);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] < key || (k[p] === key && t[p] <= tile)) break;
      k[i] = k[p]; t[i] = t[p]; i = p;
    }
    k[i] = key; t[i] = tile;
  }
  peek(): number { return this.tiles[0]; }
  pop(): number {
    const k = this.keys, t = this.tiles;
    const top = t[0];
    const lk = k.pop()!, lt = t.pop()!;
    const n = k.length;
    if (n) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = -1;
        if (l < n && (k[l] < lk || (k[l] === lk && t[l] < lt))) m = l;
        if (r < n && (k[r] < (m < 0 ? lk : k[m]) || (k[r] === (m < 0 ? lk : k[m]) && t[r] < (m < 0 ? lt : t[m])))) m = r;
        if (m < 0) break;
        k[i] = k[m]; t[i] = t[m]; i = m;
      }
      k[i] = lk; t[i] = lt;
    }
    return top;
  }
}
