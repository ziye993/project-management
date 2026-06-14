import './App.css'
import Router from './Router'
import { default as routerConfig } from './Router/config'

function App() {
  return <Router router={routerConfig} />
}

export default App
