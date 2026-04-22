const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async function (event) {
  const { fileID } = event
  const wxContext = cloud.getWXContext()

  try {
    const fileRes = await cloud.downloadFile({ fileID })
    const imageBuffer = fileRes.fileContent

    const result = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/png',
        value: imageBuffer
      },
      version: 2,
      scene: 1,
      openid: wxContext.OPENID
    })

    try { await cloud.deleteFile({ fileList: [fileID] }) } catch (e) {}

    const pass = !result.result || result.result.suggest === 'pass'
    return {
      success: true,
      pass,
      label: result.result && result.result.label,
      errCode: result.errCode
    }
  } catch (err) {
    try { await cloud.deleteFile({ fileList: [fileID] }) } catch (e) {}
    if (err.errCode === 87014) {
      return { success: true, pass: false, label: 'content_violation' }
    }
    return { success: false, error: err.message, errCode: err.errCode }
  }
}
