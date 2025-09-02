import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Simple smoke test to ensure App renders without crashing
it('renders the application shell', () => {
  render(<App />);
  // Our react-router-dom mock renders a container with this test id
  expect(screen.getByTestId('router')).toBeInTheDocument();
});
