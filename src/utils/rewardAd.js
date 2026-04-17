import Taro from '@tarojs/taro'

// 激励视频广告单元ID（上线前替换为真实ID）
const AD_UNIT_ID = 'adunit-xxxxxxxxxx'

let rewardedVideoAd = null

function getAd() {
  if (rewardedVideoAd) return rewardedVideoAd

  if (Taro.createRewardedVideoAd) {
    rewardedVideoAd = Taro.createRewardedVideoAd({ adUnitId: AD_UNIT_ID })
  }
  return rewardedVideoAd
}

// 展示激励视频，返回 Promise
// resolve(true) = 看完了，resolve(false) = 中途关闭
export function showRewardAd() {
  return new Promise((resolve) => {
    const ad = getAd()
    if (!ad) {
      // 广告组件不可用（开发阶段/未配置），直接放行
      resolve(true)
      return
    }

    ad.onClose(function onClose(res) {
      ad.offClose(onClose)
      resolve(!!(res && res.isEnded))
    })

    ad.show().catch(() => {
      // show 失败时重新加载再试
      ad.load().then(() => ad.show()).catch(() => {
        // 加载也失败，放行（不能因为广告问题卡住用户）
        resolve(true)
      })
    })
  })
}

// 判断是否需要看广告（小板免费，其他需要）
export function needAd(w, h) {
  return w > 29 || h > 29
}
