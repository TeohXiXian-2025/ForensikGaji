/**
 * ForensikGaji Frontend - Application Entry Point
 *
 * This is the main entry point for the React application. It initializes
 * the React root and mounts the App component to the DOM.
 *
 * @module main
 * @author ForensikGaji Team
 * @created May 2026
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';  // Global styles including Tailwind CSS
import App from './App.jsx';  // Main application component

// Create a React root and render the App component
// StrictMode enables additional development-time checks and warnings
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
