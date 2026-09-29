import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { tokensToCssVars } from '@lms/theme/css';
import { App } from './App';
import { LocaleProvider, initLocale } from './i18n';
import './styles/global.css';

// Tokens are the single source of truth; publish them as CSS custom properties
// before first paint so the stylesheet never needs a literal colour.
const tokenStyle = document.createElement('style');
tokenStyle.textContent = tokensToCssVars();
document.head.prepend(tokenStyle);

initLocale();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <App />
      </LocaleProvider>
    </BrowserRouter>
  </StrictMode>,
);
