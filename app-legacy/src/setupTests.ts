// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill matchMedia for MUI useMediaQuery and other consumers in tests
if (!(global as any).window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated but still used in some libs
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}

// Mock axios to avoid ESM interop issues and real HTTP during tests
jest.mock('axios', () => {
  const mockAxios: any = {
    defaults: { baseURL: '', headers: {} },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  mockAxios.create = jest.fn(() => mockAxios);
  return mockAxios;
}, { virtual: true });

// Mock ESM-only modules that CRA/Jest can't transform from node_modules
jest.mock('react-markdown', () => {
  const React = require('react');
  return ({ children }: any) => React.createElement('div', { 'data-testid': 'react-markdown' }, children);
}, { virtual: true });

// Mock remark-gfm plugin (ESM), used by Admin.tsx with ReactMarkdown
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => null,
}), { virtual: true });

// Mock mermaid (ESM) used by MermaidRenderer
jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    render: jest.fn(async (_id: string, _code: string) => ({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' })),
  },
}), { virtual: true });

// Mock html2canvas (ESM)
jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(async () => ({
    toDataURL: () => 'data:image/png;base64,'
  })),
}), { virtual: true });

// Mock date-fns (ESM)
jest.mock('date-fns', () => ({
  __esModule: true,
  // Provide commonly used functions
  format: (date: any, _fmt: any) => {
    try {
      const d = new Date(date);
      return isNaN(d.getTime()) ? '' : d.toISOString();
    } catch {
      return '';
    }
  },
  parseISO: (s: string) => new Date(s),
}), { virtual: true });

// Mock date-fns/locale (ESM)
jest.mock('date-fns/locale', () => ({
  __esModule: true,
  de: {},
}), { virtual: true });

// Suppress MUI ripple animations that trigger act() warnings in tests
jest.mock('@mui/material/ButtonBase/TouchRipple', () => ({
  __esModule: true,
  default: () => null,
}), { virtual: true });

// Provide a lightweight mock for react-router-dom so CRA/Jest can import files referencing it
jest.mock('react-router-dom', () => {
  const React = require('react');
  const Anchor = (props: any) => React.createElement('a', props, props.children);
  const Outlet = () => React.createElement('div', { 'data-testid': 'outlet' });
  const Navigate = ({ to, replace }: { to?: string; replace?: boolean }) =>
    React.createElement('div', { 'data-testid': 'navigate', to, replace: !!replace });
  return {
    __esModule: true,
    BrowserRouter: ({ children }: any) => React.createElement('div', { 'data-testid': 'router' }, children),
    Routes: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Route: (props: any) => (props.element ?? null),
    Link: Anchor,
    NavLink: Anchor,
    Outlet,
    Navigate,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/', state: undefined, search: '' }),
    useParams: () => ({ quizId: 'quiz-1' }),
  };
}, { virtual: true });
