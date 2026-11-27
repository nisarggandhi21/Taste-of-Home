import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { startPwa } from './pwa';

startPwa();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
