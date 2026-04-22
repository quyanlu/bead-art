import Taro from '@tarojs/taro'

export async function ensurePhotoAlbumAuth() {
  try {
    const setting = await Taro.getSetting()
    const status = setting.authSetting['scope.writePhotosAlbum']
    if (status === false) {
      const modal = await Taro.showModal({
        title: '需要相册权限',
        content: '保存图纸需要访问相册，请在设置中开启',
        confirmText: '去设置',
        cancelText: '取消'
      })
      if (!modal.confirm) return false
      const res = await Taro.openSetting()
      return res.authSetting['scope.writePhotosAlbum'] === true
    }
    return true
  } catch (e) {
    console.warn('[photoAuth] getSetting 失败', e)
    return true
  }
}
