/**
 * Entry Point for our React Application
 * 
 * CONCEPT: React Basics
 * React is a library for building user interfaces using components.
 * Components are reusable pieces of UI (like LEGO blocks).
 * 
 * This file:
 * 1. Imports React and ReactDOM
 * 2. Imports our main App component
 * 3. Renders the App inside the #root div
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// CONCEPT: React 18's createRoot
// This is the modern way to render React apps.
// StrictMode helps catch potential problems during development.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)







