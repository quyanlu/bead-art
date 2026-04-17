import beadColors from './beadColors.json'

// 品牌配置（国内品牌优先）
export const BRANDS = [
  { key: 'mard', label: 'MARD', desc: `${beadColors.brands.mard.colors.length}色` },
  { key: 'coco', label: 'COCO', desc: `${beadColors.brands.coco.colors.length}色` },
  { key: 'manman', label: '漫漫', desc: `${beadColors.brands.manman.colors.length}色` },
  { key: 'panpan', label: '盼盼', desc: `${beadColors.brands.panpan.colors.length}色` },
  { key: 'mixiaowo', label: '咪小窝', desc: `${beadColors.brands.mixiaowo.colors.length}色` },
  { key: 'yant', label: 'Yant', desc: `${beadColors.brands.yant.colors.length}色` },
  { key: 'artkal_s', label: 'Artkal S', desc: `${beadColors.brands.artkal_s.colors.length}色 · 5mm` },
  { key: 'artkal_a', label: 'Artkal A', desc: `${beadColors.brands.artkal_a.colors.length}色 · 2.6mm` },
  { key: 'artkal_m', label: 'Artkal M', desc: `${beadColors.brands.artkal_m.colors.length}色 · 2.6mm` },
  { key: 'artkal_r', label: 'Artkal R', desc: `${beadColors.brands.artkal_r.colors.length}色 · 5mm` },
  { key: 'artkal_c', label: 'Artkal C', desc: `${beadColors.brands.artkal_c.colors.length}色 · 2.6mm` },
  { key: 'hama', label: 'Hama', desc: `${beadColors.brands.hama.colors.length}色 · 5mm` },
  { key: 'perler', label: 'Perler', desc: `${beadColors.brands.perler.colors.length}色 · 5mm` },
]

// 获取指定品牌的色卡（算法友好格式）
export function getPaletteColors(brandKey) {
  const brand = beadColors.brands[brandKey]
  if (!brand) return []
  return brand.colors.map(c => ({
    id: c.code,
    name: c.name,
    r: c.r,
    g: c.g,
    b: c.b,
  }))
}

// 画板尺寸预设
export const BOARD_SIZES = [
  { label: '小板 29×29', width: 29, height: 29 },
  { label: '中板 58×29', width: 58, height: 29 },
  { label: '大板 58×58', width: 58, height: 58 },
]
