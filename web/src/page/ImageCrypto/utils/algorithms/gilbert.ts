/** Gilbert 2D space-filling curve — ported from pyscramble (MIT) / jakubcerveny/gilbert */

function generate2d(
  positions: number[],
  pos: { value: number },
  width: number,
  height: number,
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): void {
  const w = Math.abs(ax + ay);
  const h = Math.abs(bx + by);
  const dax = Math.sign(ax);
  const day = Math.sign(ay);
  const dbx = Math.sign(bx);
  const dby = Math.sign(by);

  if (h === 1) {
    for (let i = 0; i < w; i++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        positions[pos.value] = x + y * width;
      }
      pos.value += 1;
      x += dax;
      y += day;
    }
    return;
  }

  if (w === 1) {
    for (let i = 0; i < h; i++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        positions[pos.value] = x + y * width;
      }
      pos.value += 1;
      x += dbx;
      y += dby;
    }
    return;
  }

  let ax2 = Math.trunc(ax / 2);
  let ay2 = Math.trunc(ay / 2);
  let bx2 = Math.trunc(bx / 2);
  let by2 = Math.trunc(by / 2);
  const w2 = Math.abs(ax2 + ay2);
  const h2 = Math.abs(bx2 + by2);

  if (2 * w > 3 * h) {
    if ((w2 & 1) === 1 && w > 2) {
      ax2 += dax;
      ay2 += day;
    }
    generate2d(positions, pos, width, height, x, y, ax2, ay2, bx, by);
    generate2d(positions, pos, width, height, x + ax2, y + ay2, ax - ax2, ay - ay2, bx, by);
  } else {
    if ((h2 & 1) === 1 && h > 2) {
      bx2 += dbx;
      by2 += dby;
    }
    generate2d(positions, pos, width, height, x, y, bx2, by2, ax2, ay2);
    generate2d(positions, pos, width, height, x + bx2, y + by2, ax, ay, bx - bx2, by - by2);
    generate2d(
      positions,
      pos,
      width,
      height,
      x + (ax - dax) + (bx2 - dbx),
      y + (ay - day) + (by2 - dby),
      -bx2,
      -by2,
      -(ax - ax2),
      -(ay - ay2),
    );
  }
}

export function gilbert2d(width: number, height: number): number[] {
  const pixelCount = width * height;
  const positions = new Array<number>(pixelCount).fill(0);
  const pos = { value: 0 };

  if (width >= height) {
    generate2d(positions, pos, width, height, 0, 0, width, 0, 0, height);
  } else {
    generate2d(positions, pos, width, height, 0, 0, 0, height, width, 0);
  }

  return positions;
}
