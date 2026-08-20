import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

/**
 * HashRouter rather than BrowserRouter: this is a local single-page tool served by Vite in
 * dev and by a static build in production, and hash routing means a deep link survives a
 * refresh without any server-side rewrite rule.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
