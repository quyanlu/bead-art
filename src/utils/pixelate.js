import Taro from '@tarojs/taro'
import { findClosestBead } from './colorMatch'
import { getPaletteColors } from '../constants/palettes'

// 将图片转换为拼豆颜色网格
// 返回：{ grid: [{id, name, r, g, b}][], stats: {id, name, r, g, b, count}[] }
export function imageToBeadGrid(imageData, imgWidth, imgHeight, gridWidth, gridHeight, brandKey) {
  const paletteColors = getPaletteColors(brandKey || 'perler')
  const grid = []
  const statsMap = {}

  const cellW = imgWidth / gridWidth
  const cellH = imgHeight / gridHeight

  for (let row = 0; row < gridHeight; row++) {
    const rowData = []
    for (let col = 0; col < gridWidth; col++) {
      const startX = Math.floor(col * cellW)
      const startY = Math.floor(row * cellH)
      const endX = Math.floor((col + 1) * cellW)
      const endY = Math.floor((row + 1) * cellH)

      let totalR = 0, totalG = 0, totalB = 0, count = 0

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * imgWidth + x) * 4
          totalR += imageData[idx]
          totalG += imageData[idx + 1]
          totalB += imageData[idx + 2]
          count++
        }
      }

      const avgR = Math.round(totalR / count)
      const avgG = Math.round(totalG / count)
      const avgB = Math.round(totalB / count)

      const bead = findClosestBead(avgR, avgG, avgB, paletteColors)
      rowData.push(bead)

      if (!statsMap[bead.id]) {
        statsMap[bead.id] = { ...bead, count: 0 }
      }
      statsMap[bead.id].count++
    }
    grid.push(rowData)
  }

  const stats = Object.values(statsMap).sort((a, b) => b.count - a.count)
  return { grid, stats }
}

// 在 Canvas 上加载图片并获取像素数据
export function loadImagePixels(canvasId, tempFilePath, component) {
  return new Promise((resolve, reject) => {
    const query = Taro.createSelectorQuery()
    if (component) query.in(component)

    query.select(canvasId)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) {
          reject(new Error('Canvas not found'))
          return
        }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const img = canvas.createImage()

        img.onload = () => {
          const w = img.width
          const h = img.height
          canvas.width = w
          canvas.height = h
          ctx.drawImage(img, 0, 0, w, h)
          const imageData = ctx.getImageData(0, 0, w, h)
          resolve({ data: imageData.data, width: w, height: h })
        }

        img.onerror = (e) => reject(e)
        img.src = tempFilePath
      })
  })
}
