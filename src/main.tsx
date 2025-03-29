import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Import the dropdown fix CSS
import './styles/dropdown-fix.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
