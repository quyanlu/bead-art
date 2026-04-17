import { useState, useEffect, useRef } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Canvas, Image } from '@tarojs/components'
import { imageToBeadGrid, loadImagePixels } from '../../utils/pixelate'
import { drawBeadPattern, canvasToImage, getPatternCanvasSize } from '../../utils/beadCanvas'
import './index.scss'

const PATTERN_CELL_SIZE = 24

export default function Editor() {
  const router = useRouter()
  const [stats, setStats] = useState([])
  const [gridWidth, setGridWidth] = useState(29)
  const [gridHeight, setGridHeight] = useState(29)
  const [canvasReady, setCanvasReady] = useState(false)
  const [patternImage, setPatternImage] = useState('')

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
    try {
      Taro.showLoading({ title: '保存中...' })
      await Taro.saveImageToPhotosAlbum({ filePath: patternImage })
      Taro.hideLoading()
      Taro.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (e) {
      Taro.hideLoading()
      if (e.errMsg && e.errMsg.includes('deny')) {
        Taro.showToast({ title: '请授权相册权限', icon: 'none' })
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' })
      }
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
