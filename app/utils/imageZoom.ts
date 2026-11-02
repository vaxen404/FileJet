export interface ImageTransform { scale: number; x: number; y: number }
export interface ImagePoint { x: number; y: number }
export interface ImageBounds { width: number; height: number; imageWidth: number; imageHeight: number }

export const limitImageTransform = (value: ImageTransform, bounds: ImageBounds): ImageTransform => {
    const scale = Math.min(5, Math.max(1, value.scale))
    const maxX = Math.max(0, (bounds.imageWidth * scale - bounds.width) / 2)
    const maxY = Math.max(0, (bounds.imageHeight * scale - bounds.height) / 2)
    return { scale, x: maxX ? Math.min(maxX, Math.max(-maxX, value.x)) : 0, y: maxY ? Math.min(maxY, Math.max(-maxY, value.y)) : 0 }
}

// Points use coordinates relative to the center of the image viewport.
export const zoomImageAt = (value: ImageTransform, scale: number, point: ImagePoint, bounds: ImageBounds) => {
    const nextScale = Math.min(5, Math.max(1, scale))
    const ratio = nextScale / value.scale
    return limitImageTransform({ scale: nextScale, x: point.x - (point.x - value.x) * ratio, y: point.y - (point.y - value.y) * ratio }, bounds)
}

export const pinchImage = (value: ImageTransform, start: [ImagePoint, ImagePoint], current: [ImagePoint, ImagePoint], bounds: ImageBounds) => {
    const distance = (points: [ImagePoint, ImagePoint]) => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
    const midpoint = (points: [ImagePoint, ImagePoint]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 })
    const from = midpoint(start), to = midpoint(current)
    const scale = Math.min(5, Math.max(1, value.scale * distance(current) / Math.max(1, distance(start))))
    const ratio = scale / value.scale
    return limitImageTransform({ scale, x: to.x - (from.x - value.x) * ratio, y: to.y - (from.y - value.y) * ratio }, bounds)
}
