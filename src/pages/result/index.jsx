import { useState, useEffect, useMemo } from 'react'
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { View, Text, ScrollView, Canvas } from '@tarojs/components'
import { ensurePhotoAlbumAuth } from '../../utils/photoAuth'
import './index.scss'

const ROW_HEIGHT = 44
const CANVAS_WIDTH = 600
const HEADER_HEIGHT = 100
const PADDING = 20

const generateResultShareImage = (stats, gridSize) => {
  return new Promise((resolve, reject) => {
    Taro.createSelectorQuery()
      .select('#share-canvas-result')
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

        const topColors = [...stats]
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
        const dotR = 18
        const dotGap = 14
        const totalDotW = topColors.length * (dotR * 2) + (topColors.length - 1) * dotGap
        const dotStartX = (SIZE - totalDotW) / 2 + dotR
        const dotY = 80
        topColors.forEach((c, i) => {
          const x = dotStartX + i * (dotR * 2 + dotGap)
          ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`
          ctx.beginPath()
          ctx.arc(x, dotY, dotR, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = 'rgba(0,0,0,0.06)'
          ctx.lineWidth = 1
          ctx.stroke()
        })

        const totalBeads = gridSize.width * gridSize.height

        ctx.fillStyle = '#2d2d2d'
        ctx.font = 'bold 30px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('我做了张拼豆图纸', SIZE / 2, 200)

        ctx.fillStyle = '#d98585'
        ctx.font = 'bold 28px sans-serif'
        ctx.fillText(`${gridSize.width} × ${gridSize.height}  ·  ${totalBeads} 颗`, SIZE / 2, 260)

        ctx.fillStyle = '#888'
        ctx.font = '20px sans-serif'
        ctx.fillText(`共用 ${stats.length} 种颜色`, SIZE / 2, 305)

        ctx.strokeStyle = '#e5ddd0'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(SIZE / 2 - 80, 360)
        ctx.lineTo(SIZE / 2 + 80, 360)
        ctx.stroke()

        ctx.fillStyle = '#666'
        ctx.font = '18px sans-serif'
        ctx.fillText('简约 · 拼豆图画家', SIZE / 2, 400)

        ctx.fillStyle = '#bbb'
        ctx.font = '14px sans-serif'
        ctx.fillText('点我也做一张 →', SIZE / 2, 440)

        Taro.canvasToTempFilePath({
          canvas,
          fileType: 'jpg',
          quality: 0.9,
          success: (r) => resolve(r.tempFilePath),
          fail: reject
        })
      })
  })
}

export default function Result() {
  const [stats, setStats] = useState([])
  const [gridSize, setGridSize] = useState({ width: 29, height: 29 })
  const [sortBy, setSortBy] = useState('code')
  const [shareImg, setShareImg] = useState('')

  useEffect(() => {
    try {
      const statsStr = Taro.getStorageSync('beadStats')
      const sizeStr = Taro.getStorageSync('beadGridSize')
      if (statsStr) setStats(JSON.parse(statsStr))
      if (sizeStr) setGridSize(JSON.parse(sizeStr))
    } catch (e) {
      console.error('读取数据失败:', e)
    }
  }, [])

  useEffect(() => {
    if (!stats.length) return
    const timer = setTimeout(() => {
      generateResultShareImage(stats, gridSize)
        .then(setShareImg)
        .catch((e) => console.warn('[share] result share image generate fail', e))
    }, 300)
    return () => clearTimeout(timer)
  }, [stats, gridSize])

  useShareAppMessage(() => ({
    title: `我做了张 ${gridSize.width}×${gridSize.height} 拼豆图纸，你也来试试`,
    path: `/pages/index/index?from=share_result&size=${gridSize.width}x${gridSize.height}`,
    imageUrl: shareImg || undefined
  }))

  useShareTimeline(() => ({
    title: '简约·拼豆图画家 | 一张图秒变拼豆图纸',
    query: `from=share_result&size=${gridSize.width}x${gridSize.height}`,
    imageUrl: shareImg || undefined
  }))

  const sortedStats = useMemo(() => {
    if (sortBy === 'count') return [...stats].sort((a, b) => b.count - a.count)
    return [...stats].sort((a, b) => {
      const ma = a.id.match(/^([A-Za-z]*)(\d+)$/)
      const mb = b.id.match(/^([A-Za-z]*)(\d+)$/)
      if (ma && mb) {
        if (ma[1] !== mb[1]) return ma[1].localeCompare(mb[1])
        return Number(ma[2]) - Number(mb[2])
      }
      return a.id.localeCompare(b.id)
    })
  }, [stats, sortBy])

  const totalBeads = gridSize.width * gridSize.height
  const canvasH = HEADER_HEIGHT + sortedStats.length * ROW_HEIGHT + PADDING * 2

  const handleSave = async () => {
    const allowed = await ensurePhotoAlbumAuth()
    if (!allowed) return
    try {
      Taro.showLoading({ title: '生成图片...' })

      const query = Taro.createSelectorQuery()
      query.select('#list-canvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0]) { Taro.hideLoading(); return }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = Taro.getSystemInfoSync().pixelRatio
        canvas.width = CANVAS_WIDTH * dpr
        canvas.height = canvasH * dpr
        ctx.scale(dpr, dpr)

        // 背景
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, CANVAS_WIDTH, canvasH)

        // 标题区
        ctx.fillStyle = '#333'
        ctx.font = 'bold 20px sans-serif'
        ctx.textBaseline = 'middle'
        ctx.fillText(`色号清单`, PADDING, 30)
        ctx.font = '14px sans-serif'
        ctx.fillStyle = '#999'
        ctx.fillText(`${gridSize.width}×${gridSize.height} | ${totalBeads}颗 | ${sortedStats.length}种颜色 | ${sortBy === 'code' ? '按色号' : '按用量'}`, PADDING, 58)

        // 表头
        const tableTop = HEADER_HEIGHT
        ctx.fillStyle = '#f5f5f5'
        ctx.fillRect(PADDING, tableTop - ROW_HEIGHT + 10, CANVAS_WIDTH - PADDING * 2, ROW_HEIGHT)
        ctx.fillStyle = '#999'
        ctx.font = '12px sans-serif'
        ctx.fillText('#', PADDING + 10, tableTop - ROW_HEIGHT / 2 + 10)
        ctx.fillText('色号', PADDING + 60, tableTop - ROW_HEIGHT / 2 + 10)
        ctx.fillText('名称', PADDING + 160, tableTop - ROW_HEIGHT / 2 + 10)
        ctx.textAlign = 'right'
        ctx.fillText('数量', CANVAS_WIDTH - PADDING - 80, tableTop - ROW_HEIGHT / 2 + 10)
        ctx.fillText('占比', CANVAS_WIDTH - PADDING - 10, tableTop - ROW_HEIGHT / 2 + 10)
        ctx.textAlign = 'left'

        // 列表
        sortedStats.forEach((item, idx) => {
          const y = tableTop + idx * ROW_HEIGHT + ROW_HEIGHT / 2

          // 色块
          ctx.fillStyle = `rgb(${item.r},${item.g},${item.b})`
          ctx.beginPath()
          ctx.arc(PADDING + 46, y, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#eee'
          ctx.lineWidth = 1
          ctx.stroke()

          // 序号
          ctx.fillStyle = '#999'
          ctx.font = '12px sans-serif'
          ctx.textAlign = 'left'
          ctx.fillText(String(idx + 1), PADDING + 10, y)

          // 色号
          ctx.fillStyle = '#333'
          ctx.font = 'bold 13px sans-serif'
          ctx.fillText(item.id, PADDING + 66, y)

          // 名称
          ctx.fillStyle = '#666'
          ctx.font = '12px sans-serif'
          const name = item.name.length > 10 ? item.name.slice(0, 10) + '..' : item.name
          ctx.fillText(name, PADDING + 160, y)

          // 数量
          ctx.textAlign = 'right'
          ctx.fillStyle = '#333'
          ctx.font = '13px sans-serif'
          ctx.fillText(`${item.count}颗`, CANVAS_WIDTH - PADDING - 80, y)

          // 占比
          ctx.fillStyle = '#999'
          ctx.font = '12px sans-serif'
          ctx.fillText(`${(item.count / totalBeads * 100).toFixed(1)}%`, CANVAS_WIDTH - PADDING - 10, y)
          ctx.textAlign = 'left'

          // 分隔线
          if (idx < sortedStats.length - 1) {
            ctx.strokeStyle = '#f0f0f0'
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(PADDING, y + ROW_HEIGHT / 2)
            ctx.lineTo(CANVAS_WIDTH - PADDING, y + ROW_HEIGHT / 2)
            ctx.stroke()
          }
        })

        // 导出图片
        Taro.canvasToTempFilePath({
          canvas,
          x: 0, y: 0,
          width: CANVAS_WIDTH * dpr,
          height: canvasH * dpr,
          destWidth: CANVAS_WIDTH * dpr,
          destHeight: canvasH * dpr,
          fileType: 'png',
          success: (imgRes) => {
            Taro.saveImageToPhotosAlbum({
              filePath: imgRes.tempFilePath,
              success: () => {
                Taro.hideLoading()
                Taro.showToast({ title: '已保存到相册', icon: 'success' })
              },
              fail: () => {
                Taro.hideLoading()
                Taro.showToast({ title: '保存失败', icon: 'none' })
              }
            })
          },
          fail: () => {
            Taro.hideLoading()
            Taro.showToast({ title: '生成图片失败', icon: 'none' })
          }
        })
      })
    } catch (e) {
      Taro.hideLoading()
      Taro.showToast({ title: '保存失败', icon: 'none' })
    }
  }

  return (
    <View className='result-page'>
      <Canvas
        type='2d'
        id='list-canvas'
        canvasId='list-canvas'
        style={`position:fixed;left:-9999px;width:${CANVAS_WIDTH}px;height:${canvasH}px;`}
      />
      <Canvas
        type='2d'
        id='share-canvas-result'
        style='position:fixed;left:-9999px;top:-9999px;width:500px;height:500px;'
      />

      <View className='overview'>
        <View className='overview-item'>
          <Text className='overview-num'>{totalBeads}</Text>
          <Text className='overview-label'>总豆数</Text>
        </View>
        <View className='overview-item'>
          <Text className='overview-num'>{stats.length}</Text>
          <Text className='overview-label'>颜色数</Text>
        </View>
        <View className='overview-item'>
          <Text className='overview-num'>{gridSize.width}×{gridSize.height}</Text>
          <Text className='overview-label'>尺寸</Text>
        </View>
      </View>

      <View className='list-section'>
        <View className='sort-bar'>
          <View
            className={`sort-item ${sortBy === 'code' ? 'active' : ''}`}
            onClick={() => setSortBy('code')}
          >
            <Text className='sort-text'>按色号</Text>
          </View>
          <View
            className={`sort-item ${sortBy === 'count' ? 'active' : ''}`}
            onClick={() => setSortBy('count')}
          >
            <Text className='sort-text'>按用量</Text>
          </View>
        </View>

        <ScrollView scrollY className='color-list'>
          {sortedStats.map((item, idx) => (
            <View key={item.id} className='color-row'>
              <View className='color-left'>
                <Text className='color-rank'>{idx + 1}</Text>
                <View
                  className='color-swatch'
                  style={`background:rgb(${item.r},${item.g},${item.b});`}
                />
                <View className='color-info'>
                  <Text className='color-name'>{item.name}</Text>
                  <Text className='color-id'>{item.id}</Text>
                </View>
              </View>
              <View className='color-right'>
                <Text className='color-count'>{item.count} 颗</Text>
                <Text className='color-percent'>{(item.count / totalBeads * 100).toFixed(1)}%</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className='save-bar'>
        <View className='save-btn' onClick={handleSave}>
          <Text className='save-btn-text'>保存色号清单</Text>
        </View>
      </View>
    </View>
  )
}
