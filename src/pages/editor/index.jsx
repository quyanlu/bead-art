import { useState, useEffect, useRef } from 'react'
import Taro, { useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { View, Text, Canvas, Image } from '@tarojs/components'
import { imageToBeadGrid, loadImagePixels } from '../../utils/pixelate'
import { drawBeadPattern, canvasToImage, getPatternCanvasSize } from '../../utils/beadCanvas'
import { ensurePhotoAlbumAuth } from '../../utils/photoAuth'
import './index.scss'

const PATTERN_CELL_SIZE = 24

const generateEditorShareImage = (patternImage, stats, gridWidth, gridHeight) => {
  return new Promise((resolve, reject) => {
    Taro.createSelectorQuery()
      .select('#share-canvas-editor')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          reject(new Error('share canvas not found'))
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const SIZE = 500
        const dpr = Taro.getSystemInfoSync().pixelRatio
        canvas.width = SIZE * dpr
        canvas.height = SIZE * dpr
        ctx.scale(dpr, dpr)

        ctx.fillStyle = '#faf7f2'
        ctx.fillRect(0, 0, SIZE, SIZE)

        const img = canvas.createImage()
        img.onload = () => {
          const boxSize = 360
          const boxX = (SIZE - boxSize) / 2
          const boxY = 50

          const imgRatio = img.width / img.height
          let drawW = boxSize
          let drawH = boxSize
          if (imgRatio >= 1) {
            drawH = boxSize / imgRatio
          } else {
            drawW = boxSize * imgRatio
          }
          const drawX = boxX + (boxSize - drawW) / 2
          const drawY = boxY + (boxSize - drawH) / 2

          ctx.fillStyle = '#ffffff'
          ctx.fillRect(boxX - 8, boxY - 8, boxSize + 16, boxSize + 16)
          ctx.strokeStyle = '#e5ddd0'
          ctx.lineWidth = 1
          ctx.strokeRect(boxX - 8, boxY - 8, boxSize + 16, boxSize + 16)

          ctx.drawImage(img, drawX, drawY, drawW, drawH)

          ctx.fillStyle = '#2d2d2d'
          ctx.font = 'bold 22px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(
            `${gridWidth} × ${gridHeight}  ·  ${gridWidth * gridHeight} 颗  ·  ${stats.length} 色`,
            SIZE / 2,
            445
          )

          ctx.fillStyle = '#888'
          ctx.font = '16px sans-serif'
          ctx.fillText('简约 · 拼豆图画家', SIZE / 2, 475)

          Taro.canvasToTempFilePath({
            canvas,
            fileType: 'jpg',
            quality: 0.9,
            success: (r) => resolve(r.tempFilePath),
            fail: reject
          })
        }
        img.onerror = (e) => reject(e || new Error('pattern image load failed'))
        img.src = patternImage
      })
  })
}

export default function Editor() {
  const router = useRouter()
  const [stats, setStats] = useState([])
  const [gridWidth, setGridWidth] = useState(29)
  const [gridHeight, setGridHeight] = useState(29)
  const [canvasReady, setCanvasReady] = useState(false)
  const [patternImage, setPatternImage] = useState('')
  const [shareImg, setShareImg] = useState('')

  useEffect(() => {
    if (!patternImage || !stats.length) return
    const timer = setTimeout(() => {
      generateEditorShareImage(patternImage, stats, gridWidth, gridHeight)
        .then(setShareImg)
        .catch((e) => console.warn('[share] editor share image generate fail', e))
    }, 300)
    return () => clearTimeout(timer)
  }, [patternImage, stats, gridWidth, gridHeight])

  useShareAppMessage(() => ({
    title: `我做了张 ${gridWidth}×${gridHeight} 拼豆图纸，你也来试试`,
    path: `/pages/index/index?from=share_editor&size=${gridWidth}x${gridHeight}`,
    imageUrl: shareImg || undefined
  }))

  useShareTimeline(() => ({
    title: '简约·拼豆图画家 | 一张图秒变拼豆图纸',
    query: `from=share_editor&size=${gridWidth}x${gridHeight}`,
    imageUrl: shareImg || undefined
  }))

  useEffect(() => {
    const { w, h } = router.params
    setGridWidth(Number(w) || 29)
    setGridHeight(Number(h) || 29)
    setTimeout(() => setCanvasReady(true), 300)
  }, [])

  useEffect(() => {
    if (!canvasReady) return
    const { path, w, h, brand } = router.params
    const imgPath = decodeURIComponent(path)
    processImage(imgPath, Number(w) || 29, Number(h) || 29, brand || 'mard')
  }, [canvasReady])

  const processImage = async (imgPath, gw, gh, brandKey) => {
    try {
      Taro.showLoading({ title: '生成图纸...' })
      const { data, width, height } = await loadImagePixels('#offscreen-canvas', imgPath)
      const result = imageToBeadGrid(data, width, height, gw, gh, brandKey)
      setStats(result.stats)

      const drawResult = await drawBeadPattern('#pattern-canvas', result.grid, {
        cellSize: PATTERN_CELL_SIZE
      })
      const tempPath = await canvasToImage(drawResult.canvas, drawResult.width, drawResult.height)
      setPatternImage(tempPath)
    } catch (e) {
      console.error('处理失败:', e)
      Taro.showToast({ title: '处理失败，请重试', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const handlePreview = () => {
    if (!patternImage) return
    Taro.previewImage({ current: patternImage, urls: [patternImage] })
  }

  const handleSave = async () => {
    if (!patternImage) return
    const allowed = await ensurePhotoAlbumAuth()
    if (!allowed) return
    try {
      Taro.showLoading({ title: '保存中...' })
      await Taro.saveImageToPhotosAlbum({ filePath: patternImage })
      Taro.hideLoading()
      Taro.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (e) {
      Taro.hideLoading()
      Taro.showToast({ title: '保存失败', icon: 'none' })
    }
  }

  const handleViewDetail = () => {
    Taro.setStorageSync('beadStats', JSON.stringify(stats))
    Taro.setStorageSync('beadGridSize', JSON.stringify({ width: gridWidth, height: gridHeight }))
    Taro.navigateTo({ url: '/pages/result/index' })
  }

  const totalBeads = gridWidth * gridHeight
  const { width: patternW, height: patternH } = getPatternCanvasSize(PATTERN_CELL_SIZE, gridWidth, gridHeight)

  return (
    <View className='editor-page'>
      <Canvas type='2d' id='offscreen-canvas' canvasId='offscreen-canvas' style='position:fixed;left:-9999px;width:1px;height:1px;' />
      <Canvas type='2d' id='pattern-canvas' canvasId='pattern-canvas' style={`position:fixed;left:-9999px;width:${patternW}px;height:${patternH}px;`} />
      <Canvas type='2d' id='share-canvas-editor' style='position:fixed;left:-9999px;top:-9999px;width:500px;height:500px;' />

      {/* 原图 + 统计 */}
      <View className='info-bar'>
        <Image
          className='original-thumb'
          src={decodeURIComponent(router.params.path)}
          mode='aspectFill'
        />
        <View className='info-stats'>
          <Text className='info-size'>{gridWidth}×{gridHeight}</Text>
          <Text className='info-detail'>{totalBeads} 颗 · {stats.length} 种颜色</Text>
        </View>
        <View className='info-redo' onClick={() => Taro.navigateBack()}>
          <Text className='info-redo-text'>重新生成</Text>
        </View>
      </View>

      <View className='preview-section'>
        <Text className='pattern-tip'>点击图纸可放大，双指缩放查看色号</Text>
        <View className='canvas-wrapper' onClick={handlePreview}>
          {patternImage ? (
            <Image className='pattern-image' src={patternImage} mode='widthFix' />
          ) : (
            <Text className='pattern-loading'>图纸生成中...</Text>
          )}
        </View>
      </View>

      <View className='action-bar'>
        <View className='btn btn-secondary' onClick={handleViewDetail}>
          <Text className='btn-text'>色号清单</Text>
        </View>
        <View className='btn btn-primary' onClick={handleSave}>
          <Text className='btn-text-white'>保存到相册</Text>
        </View>
      </View>
    </View>
  )
}
