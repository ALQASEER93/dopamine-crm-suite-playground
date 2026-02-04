import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import App from './App.jsx';
import './styles/global.css';

const resolveInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  try {
    const storedTheme = window.localStorage?.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
  } catch (error) {
    console.warn('Theme storage unavailable', error);
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', resolveInitialTheme());
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
