import Taro from '@tarojs/taro'
import './app.scss'

function App({ children }) {
  if (Taro.cloud) {
    Taro.cloud.init({
      env: 'cloud1-9gvrpgvz31934357',
      traceUser: true
    })
  }
  return children
}

export default App
