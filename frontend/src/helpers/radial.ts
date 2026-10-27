export interface RadialOptions {
  startDeg: number;
  endDeg: number;
  radiusX: number;
  radiusY: number;
}

export interface Point {
  x: number;
  y: number;
}

export function radialPositions(count: number, { startDeg, endDeg, radiusX, radiusY }: RadialOptions): Point[] {
  if (count <= 0) return [];
  const step = count === 1 ? 0 : (endDeg - startDeg) / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const deg = count === 1 ? (startDeg + endDeg) / 2 : startDeg + step * i;
    const rad = (deg * Math.PI) / 180;
    return { x: Math.round(radiusX * Math.cos(rad)), y: Math.round(-radiusY * Math.sin(rad)) };
  });
}
