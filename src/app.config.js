export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/editor/index',
    'pages/result/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '拼豆图画家',
    navigationBarTextStyle: 'black'
  },
  permission: {
    'scope.writePhotosAlbum': {
      desc: '用于将生成的拼豆图纸保存到你的相册'
    }
  },
  lazyCodeLoading: 'requiredComponents'
})
