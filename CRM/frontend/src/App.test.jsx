import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import App from './App';

describe('App', () => {
  it('renders the login screen when no user is authenticated', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // نستخدم createElement بدل JSX لتفادي jsxDEV
    render(
      <QueryClientProvider client={queryClient}>
        {React.createElement(App)}
      </QueryClientProvider>,
    );

    expect(screen.getByText(/CRM Sign in/i)).toBeInTheDocument();
  });
});
