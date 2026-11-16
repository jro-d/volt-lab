/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Dev-only device gallery: http://localhost:5174/?gallery
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('gallery')) {
  import('./dev/DeviceGallery').then(({ DeviceGallery }) => root.render(<DeviceGallery />));
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
