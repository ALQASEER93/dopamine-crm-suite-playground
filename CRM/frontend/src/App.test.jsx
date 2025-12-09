import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import App from './App';

describe('App', () => {
  it('renders the login screen when no user is authenticated', () => {
    // نستخدم createElement بدل JSX لتفادي jsxDEV
    render(React.createElement(App));

    expect(screen.getByText(/CRM Sign in/i)).toBeInTheDocument();
  });
});
