import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import WorkspacePage from './pages/WorkspacePage'
import PlayExperiencePage from './pages/PlayExperiencePage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/play" element={<PlayExperiencePage />} />
      </Routes>
    </Router>
  )
}

export default App
