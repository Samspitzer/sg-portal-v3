import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initializeMsal } from '@/services/auth';
import { initializeTheme } from '@/contexts';
import '@/assets/styles/globals.css';

// Initialize theme before render to prevent flash
initializeTheme();

// Initialize MSAL and render app
async function main() {
  try {
    await initializeMsal();
  } catch (error) {
    console.error('Failed to initialize MSAL:', error);
  }

  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

main();
