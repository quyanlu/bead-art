// RGB -> Lab 颜色空间转换 + CIEDE2000 色差算法

function rgbToLab(r, g, b) {
  // RGB -> XYZ
  let rr = r / 255, gg = g / 255, bb = b / 255
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92
  rr *= 100; gg *= 100; bb *= 100

  const x = rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375
  const y = rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750
  const z = rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041

  // XYZ -> Lab (D65 白点)
  let xr = x / 95.047, yr = y / 100.0, zr = z / 108.883
  const epsilon = 0.008856
  const kappa = 903.3
  xr = xr > epsilon ? Math.cbrt(xr) : (kappa * xr + 16) / 116
  yr = yr > epsilon ? Math.cbrt(yr) : (kappa * yr + 16) / 116
  zr = zr > epsilon ? Math.cbrt(zr) : (kappa * zr + 16) / 116

  return [116 * yr - 16, 500 * (xr - yr), 200 * (yr - zr)]
}

// CIEDE2000 色差计算
function ciede2000(lab1, lab2) {
  const [L1, a1, b1] = lab1
  const [L2, a2, b2] = lab2
  const rad = Math.PI / 180
  const deg = 180 / Math.PI

  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const mC = (C1 + C2) / 2
  const mC7 = Math.pow(mC, 7)
  const G = 0.5 * (1 - Math.sqrt(mC7 / (mC7 + Math.pow(25, 7))))

  const a1p = a1 * (1 + G)
  const a2p = a2 * (1 + G)
  const C1p = Math.sqrt(a1p * a1p + b1 * b1)
  const C2p = Math.sqrt(a2p * a2p + b2 * b2)

  let h1p = Math.atan2(b1, a1p) * deg
  if (h1p < 0) h1p += 360
  let h2p = Math.atan2(b2, a2p) * deg
  if (h2p < 0) h2p += 360

  const dLp = L2 - L1
  const dCp = C2p - C1p

  let dhp
  if (C1p * C2p === 0) {
    dhp = 0
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360
  } else {
    dhp = h2p - h1p + 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * rad / 2)

  const mLp = (L1 + L2) / 2
  const mCp = (C1p + C2p) / 2

  let mhp
  if (C1p * C2p === 0) {
    mhp = h1p + h2p
  } else if (Math.abs(h1p - h2p) <= 180) {
    mhp = (h1p + h2p) / 2
  } else if (h1p + h2p < 360) {
    mhp = (h1p + h2p + 360) / 2
  } else {
    mhp = (h1p + h2p - 360) / 2
  }

  const T = 1
    - 0.17 * Math.cos((mhp - 30) * rad)
    + 0.24 * Math.cos(2 * mhp * rad)
    + 0.32 * Math.cos((3 * mhp + 6) * rad)
    - 0.20 * Math.cos((4 * mhp - 63) * rad)

  const SL = 1 + 0.015 * Math.pow(mLp - 50, 2) / Math.sqrt(20 + Math.pow(mLp - 50, 2))
  const SC = 1 + 0.045 * mCp
  const SH = 1 + 0.015 * mCp * T

  const mCp7 = Math.pow(mCp, 7)
  const RT = -2 * Math.sqrt(mCp7 / (mCp7 + Math.pow(25, 7)))
    * Math.sin(60 * rad * Math.exp(-Math.pow((mhp - 275) / 25, 2)))

  return Math.sqrt(
    Math.pow(dLp / SL, 2) +
    Math.pow(dCp / SC, 2) +
    Math.pow(dHp / SH, 2) +
    RT * (dCp / SC) * (dHp / SH)
  )
}

// 预计算色卡的 Lab 值（缓存提升性能）
let cachedPalette = null
let cachedLabColors = null

function getLabColors(paletteColors) {
  if (cachedPalette === paletteColors) return cachedLabColors
  cachedLabColors = paletteColors.map(c => ({
    ...c,
    lab: rgbToLab(c.r, c.g, c.b)
  }))
  cachedPalette = paletteColors
  return cachedLabColors
}

// 找到最接近的拼豆颜色
export function findClosestBead(r, g, b, paletteColors) {
  const labColors = getLabColors(paletteColors)
  const pixelLab = rgbToLab(r, g, b)

  let minDist = Infinity
  let closest = labColors[0]

  for (let i = 0; i < labColors.length; i++) {
    const dist = ciede2000(pixelLab, labColors[i].lab)
    if (dist < minDist) {
      minDist = dist
      closest = labColors[i]
    }
  }

  return closest
}
