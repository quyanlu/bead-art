import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image, Input, Picker } from '@tarojs/components'
import { BOARD_SIZES, BRANDS } from '../../constants/palettes'
import './index.scss'

export default function Index() {
  const [selectedSize, setSelectedSize] = useState(0)
  const [selectedBrand, setSelectedBrand] = useState(0)
  const [customW, setCustomW] = useState(29)
  const [customH, setCustomH] = useState(29)
  const [imagePath, setImagePath] = useState('')

  const handleChooseImage = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        setImagePath(res.tempFilePaths[0])
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
      <View className='hero'>
        <Text className='hero-title'>拼豆图纸生成工坊</Text>
        <Text className='hero-desc'>一张图片，秒变拼豆图纸</Text>
      </View>

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
