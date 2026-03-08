import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const redirectPath = sessionStorage.getItem('gh-pages-redirect')
if (redirectPath) {
  sessionStorage.removeItem('gh-pages-redirect')
  window.history.replaceState(null, '', redirectPath)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
