export interface ImageCrop { x: number; y: number; width: number; height: number }
export const fullImageCrop = (): ImageCrop => ({ x: 0, y: 0, width: 1, height: 1 })
export const rotatedImageSize = (width: number, height: number, turns: number) =>
    Math.abs(turns % 2) === 1 ? { width: height, height: width } : { width, height }
export const cropPixels = (crop: ImageCrop, width: number, height: number) => {
    const x = Math.min(width - 1, Math.max(0, Math.round(crop.x * width)))
    const y = Math.min(height - 1, Math.max(0, Math.round(crop.y * height)))
    return { x, y, width: Math.max(1, Math.min(width - x, Math.round(crop.width * width))), height: Math.max(1, Math.min(height - y, Math.round(crop.height * height))) }
}
export const editableImageType = (name: string, mime: string | null | undefined) => {
    if (/\.jpe?g$/i.test(name) && mime === 'image/jpeg') return 'image/jpeg'
    if (/\.png$/i.test(name) && mime === 'image/png') return 'image/png'
    if (/\.webp$/i.test(name) && mime === 'image/webp') return 'image/webp'
    return null
}
