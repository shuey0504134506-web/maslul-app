import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { syncEngine } from '@/services/sync/syncEngine';
import './styles/index.css';

// מפעילים את מנוע הסנכרון פעם אחת, ברגע עליית האפליקציה - זה מה שתופס
// פעולות שנוצרו אופליין ולא סונכרנו מעולם, גם אחרי סגירות חוזרות.
syncEngine.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
