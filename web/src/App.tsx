import './App.css'
import Router from './Router'
import { default as routerConfig } from './Router/config'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Router router={routerConfig} />
    </AuthProvider>
  )
}

export default App
