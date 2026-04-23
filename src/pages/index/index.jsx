import { useState, useEffect } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, useRouter } from '@tarojs/taro'
import { View, Text, Image, Input, Picker, Canvas } from '@tarojs/components'
import { BOARD_SIZES, BRANDS } from '../../constants/palettes'
import './index.scss'

const generateHomeShareImage = () => {
  return new Promise((resolve, reject) => {
    Taro.createSelectorQuery()
      .select('#share-canvas-home')
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

        const pixelColors = [
          '#f4a6a6', '#a6c8f4', '#a6f4b5', '#f4e9a6', '#d9a6f4',
          '#a6f4e9', '#f4b8a6', '#f4a6d9', '#b5a6f4', '#c8f4a6',
          '#f4a6a6', '#ffffff', '#f4e9a6', '#ffffff', '#a6c8f4',
          '#a6f4b5', '#f4b8a6', '#ffffff', '#d9a6f4', '#f4a6d9',
          '#ffffff', '#a6f4e9', '#b5a6f4', '#f4e9a6', '#c8f4a6'
        ]
        const cell = 36
        const gap = 4
        const gridW = cell * 5 + gap * 4
        const gridX = (SIZE - gridW) / 2
        const gridY = 70
        pixelColors.forEach((c, i) => {
          const row = Math.floor(i / 5)
          const col = i % 5
          ctx.fillStyle = c
          const x = gridX + col * (cell + gap)
          const y = gridY + row * (cell + gap)
          ctx.fillRect(x, y, cell, cell)
        })

        ctx.fillStyle = '#2d2d2d'
        ctx.font = 'bold 32px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('简约·拼豆图画家', SIZE / 2, 320)

        ctx.fillStyle = '#888'
        ctx.font = '20px sans-serif'
        ctx.fillText('一张图片 · 秒变拼豆图纸', SIZE / 2, 360)

        ctx.fillStyle = '#d98585'
        ctx.font = '16px sans-serif'
        ctx.fillText('DIY · 创意 · 治愈', SIZE / 2, 430)

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

const compressByCanvas = (src) => {
  return new Promise((resolve, reject) => {
    Taro.createSelectorQuery()
      .select('#compress-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          reject(new Error('canvas node not found'))
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const img = canvas.createImage()
        img.onload = () => {
          const maxSize = 1024
          let w = img.width
          let h = img.height
          if (w > maxSize || h > maxSize) {
            const ratio = Math.min(maxSize / w, maxSize / h)
            w = Math.round(w * ratio)
            h = Math.round(h * ratio)
          }
          canvas.width = w
          canvas.height = h
          ctx.clearRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)
          Taro.canvasToTempFilePath({
            canvas,
            fileType: 'jpg',
            quality: 0.7,
            success: (r) => resolve(r.tempFilePath),
            fail: reject
          })
        }
        img.onerror = (e) => reject(e || new Error('image load failed'))
        img.src = src
      })
  })
}

export default function Index() {
  const router = useRouter()
  const fromShare = router.params.from || ''
  const sharedSize = router.params.size || ''

  const [selectedSize, setSelectedSize] = useState(0)
  const [selectedBrand, setSelectedBrand] = useState(0)
  const [customW, setCustomW] = useState(29)
  const [customH, setCustomH] = useState(29)
  const [imagePath, setImagePath] = useState('')
  const [shareImg, setShareImg] = useState('')

  useEffect(() => {
    if (!sharedSize) return
    const m = sharedSize.match(/^(\d+)x(\d+)$/)
    if (!m) return
    const w = Number(m[1])
    const h = Number(m[2])
    if (!w || !h) return
    const matchIdx = BOARD_SIZES.findIndex((b) => b.width === w && b.height === h)
    if (matchIdx >= 0) {
      setSelectedSize(matchIdx)
    } else {
      setSelectedSize(BOARD_SIZES.length)
      setCustomW(Math.min(100, Math.max(5, w)))
      setCustomH(Math.min(100, Math.max(5, h)))
    }
  }, [sharedSize])

  useEffect(() => {
    const timer = setTimeout(() => {
      generateHomeShareImage()
        .then(setShareImg)
        .catch((e) => console.warn('[share] home share image generate fail', e))
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  useShareAppMessage(() => ({
    title: '一张图片，秒变拼豆图纸',
    path: '/pages/index/index?from=share_home',
    imageUrl: shareImg || undefined
  }))

  useShareTimeline(() => ({
    title: '简约·拼豆图画家 | 一张图秒变拼豆图纸',
    query: 'from=share_home',
    imageUrl: shareImg || undefined
  }))

  const handleChooseImage = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempPath = res.tempFilePaths[0]
        console.log('[imgCheck] 选图完成', tempPath)
        if (!Taro.cloud) {
          console.error('[imgCheck] Taro.cloud 未初始化')
          Taro.showToast({ title: '云开发未初始化', icon: 'none' })
          return
        }
        Taro.showLoading({ title: '检测图片中...', mask: true })
        try {
          let filePath = tempPath
          try {
            filePath = await compressByCanvas(tempPath)
            console.log('[imgCheck] canvas压缩完成', filePath)
          } catch (e) {
            console.warn('[imgCheck] canvas压缩失败，尝试compressImage', e)
            try {
              const r = await Taro.compressImage({
                src: tempPath,
                quality: 60,
                compressedWidth: 1024
              })
              filePath = r.tempFilePath
              console.log('[imgCheck] compressImage完成', filePath)
            } catch (e2) {
              console.warn('[imgCheck] 全部压缩失败，拒绝上传', e2)
              Taro.hideLoading()
              Taro.showToast({ title: '图片处理失败，请换一张', icon: 'none' })
              return
            }
          }
          const uploadRes = await Taro.cloud.uploadFile({
            cloudPath: `check/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`,
            filePath
          })
          console.log('[imgCheck] 上传完成', uploadRes.fileID)
          const checkRes = await Taro.cloud.callFunction({
            name: 'imgCheck',
            data: { fileID: uploadRes.fileID }
          })
          console.log('[imgCheck] 检测结果', checkRes.result)
          Taro.hideLoading()
          const data = checkRes.result || {}
          if (!data.success) {
            Taro.showToast({ title: '检测失败，请重试', icon: 'none' })
            return
          }
          if (!data.pass) {
            Taro.showModal({
              title: '图片未通过审核',
              content: '你上传的图片含违规信息，请更换后重试',
              showCancel: false
            })
            return
          }
          setImagePath(tempPath)
        } catch (err) {
          console.error('[imgCheck] 失败', err)
          Taro.hideLoading()
          Taro.showToast({
            title: (err && err.errMsg) || '网络异常，请重试',
            icon: 'none',
            duration: 3000
          })
        }
      }
    })
  }

  const handleGenerate = () => {
    if (!imagePath) {
      Taro.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    const size = selectedSize < BOARD_SIZES.length
      ? BOARD_SIZES[selectedSize]
      : { width: customW, height: customH }

    const brand = BRANDS[selectedBrand].key

    Taro.navigateTo({
      url: `/pages/editor/index?path=${encodeURIComponent(imagePath)}&w=${size.width}&h=${size.height}&brand=${brand}`
    })
  }

  return (
    <View className='index-page'>
      <Canvas
        type='2d'
        id='compress-canvas'
        style='position:fixed;left:-9999px;top:-9999px;width:1024px;height:1024px;'
      />
      <Canvas
        type='2d'
        id='share-canvas-home'
        style='position:fixed;left:-9999px;top:-9999px;width:500px;height:500px;'
      />
      <View className='hero'>
        <Text className='hero-title'>简约·拼豆图画家</Text>
        <Text className='hero-desc'>一张图片，秒变拼豆图纸</Text>
      </View>

      {fromShare && (
        <View className='share-banner'>
          <Text className='share-banner-text'>
            {fromShare === 'share_editor' && sharedSize
              ? `朋友做了张 ${sharedSize} 拼豆图纸 · 你也来一张`
              : fromShare === 'share_result' && sharedSize
                ? `朋友生成了色号清单 · 一张图秒变图纸`
                : '朋友推荐 · 一张图秒变拼豆图纸'}
          </Text>
        </View>
      )}

      <View className='section'>
        <Text className='section-title'>选择图片</Text>
        <View className='image-picker' onClick={handleChooseImage}>
          {imagePath ? (
            <Image className='preview-image' src={imagePath} mode='widthFix' />
          ) : (
            <View className='placeholder'>
              <Text className='plus'>+</Text>
              <Text className='tip'>点击选择图片</Text>
            </View>
          )}
        </View>
      </View>

      <View className='section'>
        <Text className='section-title'>拼豆品牌</Text>
        <Picker
          mode='selector'
          range={BRANDS.map(b => `${b.label}（${b.desc}）`)}
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(Number(e.detail.value))}
        >
          <View className='brand-picker'>
            <Text className='brand-picker-text'>{BRANDS[selectedBrand].label}</Text>
            <Text className='brand-picker-desc'>{BRANDS[selectedBrand].desc}</Text>
            <Text className='brand-picker-arrow'>&#9662;</Text>
          </View>
        </Picker>
      </View>

      <View className='section'>
        <Text className='section-title'>画板尺寸</Text>
        <View className='size-list'>
          {BOARD_SIZES.map((size, idx) => (
            <View
              key={idx}
              className={`size-item ${selectedSize === idx ? 'active' : ''}`}
              onClick={() => setSelectedSize(idx)}
            >
              <Text className='size-label'>{size.label}</Text>
              <Text className='size-count'>{size.width * size.height} 颗</Text>
            </View>
          ))}
          <View
            className={`size-item ${selectedSize === BOARD_SIZES.length ? 'active' : ''}`}
            onClick={() => setSelectedSize(BOARD_SIZES.length)}
          >
            <Text className='size-label'>自定义</Text>
          </View>
        </View>

        {selectedSize === BOARD_SIZES.length && (
          <View className='custom-size'>
            <View className='custom-input-group'>
              <Text>宽</Text>
              <Input
                type='number'
                className='custom-input'
                value={String(customW)}
                onInput={(e) => setCustomW(Math.min(100, Math.max(5, Number(e.detail.value) || 5)))}
              />
              <Text>× 高</Text>
              <Input
                type='number'
                className='custom-input'
                value={String(customH)}
                onInput={(e) => setCustomH(Math.min(100, Math.max(5, Number(e.detail.value) || 5)))}
              />
            </View>
          </View>
        )}
      </View>

      <View className='generate-btn' onClick={handleGenerate}>
        <Text className='btn-text'>生成图纸</Text>
      </View>
    </View>
  )
}
