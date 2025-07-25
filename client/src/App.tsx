import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Documents from './pages/Documents';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import FAQList from './pages/FAQList';
import FAQDetail from './pages/FAQDetail';
import Workspace from './pages/Workspace';
import MessageAnalyzerPage from './pages/MessageAnalyzer';
import CodeLookupPage from './pages/CodeLookup';
import QuizDashboard from './components/Quiz/QuizDashboard';
import QuizPlayer from './components/Quiz/QuizPlayer';
import ProtectedRoute from './components/ProtectedRoute';
import Teams from './pages/Teams';
import InvitationAcceptance from './pages/InvitationAcceptance';

const theme = createTheme({
  palette: {
    primary: {
      main: '#147a50',
      light: '#4a9b73',
      dark: '#0d5538',
    },
    secondary: {
      main: '#147a50',
      light: '#4a9b73',
      dark: '#0d5538',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SnackbarProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/invitation/:token" element={<InvitationAcceptance />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="chat/:chatId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                <Route path="workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
                <Route path="faq" element={<FAQList />} />
                <Route path="faqs/:id" element={<FAQDetail />} />
                <Route path="quiz" element={<ProtectedRoute><QuizDashboard /></ProtectedRoute>} />
                <Route path="quiz/:quizId" element={<ProtectedRoute><QuizPlayer /></ProtectedRoute>} />
                <Route path="teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
                <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="admin/*" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
                <Route path="message-analyzer" element={<ProtectedRoute><MessageAnalyzerPage /></ProtectedRoute>} />
                <Route path="code-lookup" element={<ProtectedRoute><CodeLookupPage /></ProtectedRoute>} />
                <Route path="lookup" element={<ProtectedRoute><CodeLookupPage /></ProtectedRoute>} />
                <Route path="invitation-acceptance" element={<InvitationAcceptance />} />
              </Route>
            </Routes>
          </Router>
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
