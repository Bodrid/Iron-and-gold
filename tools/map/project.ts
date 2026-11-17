// Equirectangular projection from longitude/latitude to map tiles.
export interface Projection { width: number; height: number; latTop: number; latBottom: number; toTile(lon: number, lat: number): [number, number]; toTileF(lon: number, lat: number): [number, number] }

export function makeProjection(width: number, latTop = 80, latBottom = -56): Projection {
  const height = Math.round((width * (latTop - latBottom)) / 360);
  const toTileF = (lon: number, lat: number): [number, number] => [((lon + 180) / 360) * width, ((latTop - lat) / (latTop - latBottom)) * height];
  const toTile = (lon: number, lat: number): [number, number] => {
    const [x, y] = toTileF(lon, lat);
    return [Math.min(width - 1, Math.max(0, Math.floor(x))), Math.min(height - 1, Math.max(0, Math.floor(y)))];
  };
  return { width, height, latTop, latBottom, toTile, toTileF };
}

export const GRID = makeProjection(2400);
export const lonLatToTile = GRID.toTile;
