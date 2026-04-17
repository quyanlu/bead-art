import Taro from '@tarojs/taro'

// 在 Canvas 上绘制拼豆网格图（含刻度尺）
export function drawBeadGrid(canvasId, grid, options = {}, component) {
  const {
    cellSize = 20,
    beadRadius = 8,
    showGrid = true,
    bgColor = '#f5f5f5',
  } = options

  const rows = grid.length
  const cols = grid[0].length

  // 刻度尺区域大小（根据 cellSize 自适应）
  const rulerSize = Math.max(cellSize * 2, 16)
  const totalWidth = rulerSize + cols * cellSize
  const totalHeight = rulerSize + rows * cellSize

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
        const dpr = Taro.getSystemInfoSync().pixelRatio
        canvas.width = totalWidth * dpr
        canvas.height = totalHeight * dpr
        ctx.scale(dpr, dpr)

        // 整体背景
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, totalWidth, totalHeight)

        // 画板背景
        ctx.fillStyle = bgColor
        ctx.fillRect(rulerSize, rulerSize, cols * cellSize, rows * cellSize)

        // 绘制豆子
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const bead = grid[row][col]
            const cx = rulerSize + col * cellSize + cellSize / 2
            const cy = rulerSize + row * cellSize + cellSize / 2

            ctx.beginPath()
            ctx.arc(cx, cy, beadRadius, 0, Math.PI * 2)
            ctx.fillStyle = `rgb(${bead.r},${bead.g},${bead.b})`
            ctx.fill()

            if (beadRadius > 4) {
              ctx.beginPath()
              ctx.arc(cx, cy, Math.max(1, beadRadius * 0.25), 0, Math.PI * 2)
              ctx.fillStyle = bgColor
              ctx.fill()
            }
          }
        }

        // 网格线
        if (showGrid) {
          ctx.strokeStyle = '#ddd'
          ctx.lineWidth = 0.5
          for (let i = 0; i <= cols; i++) {
            ctx.beginPath()
            ctx.moveTo(rulerSize + i * cellSize, rulerSize)
            ctx.lineTo(rulerSize + i * cellSize, rulerSize + rows * cellSize)
            ctx.stroke()
          }
          for (let i = 0; i <= rows; i++) {
            ctx.beginPath()
            ctx.moveTo(rulerSize, rulerSize + i * cellSize)
            ctx.lineTo(rulerSize + cols * cellSize, rulerSize + i * cellSize)
            ctx.stroke()
          }
        }

        // 刻度字体大小自适应
        const fontSize = Math.max(Math.floor(cellSize * 0.6), 6)
        ctx.font = `${fontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#999'

        // 顶部刻度（列号）- 每列都标
        for (let col = 0; col < cols; col++) {
          const x = rulerSize + col * cellSize + cellSize / 2
          const y = rulerSize / 2
          ctx.fillText(String(col + 1), x, y)
        }

        // 左侧刻度（行号）- 每行都标
        for (let row = 0; row < rows; row++) {
          const x = rulerSize / 2
          const y = rulerSize + row * cellSize + cellSize / 2
          ctx.fillText(String(row + 1), x, y)
        }

        // 刻度区域分隔线
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(rulerSize, 0)
        ctx.lineTo(rulerSize, totalHeight)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, rulerSize)
        ctx.lineTo(totalWidth, rulerSize)
        ctx.stroke()

        resolve({ canvas, width: totalWidth, height: totalHeight })
      })
  })
}

// 绘制拼豆图纸（每个格子显示色号）
export function drawBeadPattern(canvasId, grid, options = {}, component) {
  const {
    cellSize = 24,
    bgColor = '#fff',
  } = options

  const rows = grid.length
  const cols = grid[0].length
  const rulerSize = Math.max(cellSize * 1.5, 20)
  const totalWidth = rulerSize + cols * cellSize
  const totalHeight = rulerSize + rows * cellSize

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
        const dpr = Taro.getSystemInfoSync().pixelRatio
        canvas.width = totalWidth * dpr
        canvas.height = totalHeight * dpr
        ctx.scale(dpr, dpr)

        // 整体背景
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, totalWidth, totalHeight)

        const fontSize = Math.max(Math.floor(cellSize * 0.35), 6)

        // 绘制每个格子
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const bead = grid[row][col]
            const x = rulerSize + col * cellSize
            const y = rulerSize + row * cellSize

            // 格子背景色
            ctx.fillStyle = `rgb(${bead.r},${bead.g},${bead.b})`
            ctx.fillRect(x, y, cellSize, cellSize)

            // 网格线
            ctx.strokeStyle = 'rgba(0,0,0,0.15)'
            ctx.lineWidth = 0.5
            ctx.strokeRect(x, y, cellSize, cellSize)

            // 色号文字（深色背景用白字，浅色背景用黑字）
            const brightness = bead.r * 0.299 + bead.g * 0.587 + bead.b * 0.114
            ctx.fillStyle = brightness > 140 ? '#333' : '#fff'
            ctx.font = `bold ${fontSize}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(bead.id, x + cellSize / 2, y + cellSize / 2)
          }
        }

        // 刻度
        const rulerFontSize = Math.max(Math.floor(cellSize * 0.45), 7)
        ctx.font = `${rulerFontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#666'

        for (let col = 0; col < cols; col++) {
          ctx.fillText(String(col + 1), rulerSize + col * cellSize + cellSize / 2, rulerSize / 2)
        }
        for (let row = 0; row < rows; row++) {
          ctx.fillText(String(row + 1), rulerSize / 2, rulerSize + row * cellSize + cellSize / 2)
        }

        // 刻度分隔线
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(rulerSize, 0)
        ctx.lineTo(rulerSize, totalHeight)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, rulerSize)
        ctx.lineTo(totalWidth, rulerSize)
        ctx.stroke()

        resolve({ canvas, width: totalWidth, height: totalHeight })
      })
  })
}

// 获取图纸模式的 canvas 尺寸
export function getPatternCanvasSize(cellSize, gridWidth, gridHeight) {
  const rulerSize = Math.max(cellSize * 1.5, 20)
  return {
    width: rulerSize + gridWidth * cellSize,
    height: rulerSize + gridHeight * cellSize,
  }
}

// 将 canvas 导出为临时文件路径
export function canvasToImage(canvas, width, height) {
  const dpr = Taro.getSystemInfoSync().pixelRatio
  return new Promise((resolve, reject) => {
    Taro.canvasToTempFilePath({
      canvas,
      x: 0,
      y: 0,
      width: width * dpr,
      height: height * dpr,
      destWidth: width * dpr,
      destHeight: height * dpr,
      fileType: 'png',
      success: (res) => resolve(res.tempFilePath),
      fail: reject
    })
  })
}

// 获取含刻度尺的 canvas 总尺寸
export function getCanvasSize(cellSize, gridWidth, gridHeight) {
  const rulerSize = Math.max(cellSize * 2, 16)
  return {
    width: rulerSize + gridWidth * cellSize,
    height: rulerSize + gridHeight * cellSize,
    rulerSize
  }
}
