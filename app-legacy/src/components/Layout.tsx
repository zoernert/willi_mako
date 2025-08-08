import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Chat as ChatIcon,
  Description as DocumentsIcon,
  AdminPanelSettings as AdminIcon,
  Person as ProfileIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  ElectricBolt as EnergyIcon,
  QuestionAnswer as FAQIcon,
  Quiz as QuizIcon,
  Rule as RuleIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  AccountTree as ProcessIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import HeaderQuickNoteButton from './Workspace/HeaderQuickNoteButton';

const drawerWidth = 240;

const Layout: React.FC = () => {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
    { text: 'Mein Workspace', icon: <DocumentsIcon />, path: '/workspace' },
    { text: 'Teams', icon: <GroupIcon />, path: '/teams' },
    { text: 'FAQ', icon: <FAQIcon />, path: '/faq' },
    { text: 'Wissens-Challenge', icon: <QuizIcon />, path: '/quiz' },
    { text: 'Prozesse und Verfahren', icon: <ProcessIcon />, path: '/processes' },
    { text: 'Dokumente', icon: <DocumentsIcon />, path: '/documents' },
    { text: 'Nachrichten-Analyzer', icon: <RuleIcon />, path: '/message-analyzer' },
    { text: 'Marktpartner Suche', icon: <SearchIcon />, path: '/code-lookup' },
    ...(state.user?.role === 'admin' 
      ? [{ text: 'Admin', icon: <AdminIcon />, path: '/admin' }] 
      : []
    ),
  ];

  const drawer = (
    <Box>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <EnergyIcon color="primary" />
        <Box>
          <Typography variant="h6" component="div" color="primary" fontWeight="bold">
            Stromhaltig
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Willi Mako
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) {
                  setMobileOpen(false);
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Stromhaltig - Willi Mako
          </Typography>
          <HeaderQuickNoteButton />
          <Button
            color="inherit"
            onClick={handleProfileMenuOpen}
            startIcon={<Avatar sx={{ width: 32, height: 32 }}>{state.user?.name?.charAt(0)}</Avatar>}
          >
            {state.user?.name}
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            onClick={handleProfileMenuClose}
          >
            <MenuItem onClick={() => navigate('/profile')}>
              <ListItemIcon>
                <ProfileIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profil</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Abmelden</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
        <Box 
          component="footer" 
          sx={{ 
            mt: 'auto', 
            py: 3,
            px: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'grey.50'
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', md: 'center' },
            gap: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EnergyIcon color="primary" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                © 2025 by STROMDAO GmbH
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              gap: 3,
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', md: 'flex-end' }
            }}>
              <Typography 
                variant="body2" 
                color="primary" 
                component="a" 
                href="/impressum" 
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' } 
                }}
              >
                Impressum
              </Typography>
              <Typography 
                variant="body2" 
                color="primary" 
                component="a" 
                href="/datenschutz" 
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' } 
                }}
              >
                Datenschutz
              </Typography>
              <Typography 
                variant="body2" 
                color="primary" 
                component="a" 
                href="/nutzungsbedingungen" 
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' } 
                }}
              >
                Nutzungsbedingungen
              </Typography>
              <Typography 
                variant="body2" 
                color="primary" 
                component="a" 
                href="/" 
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' } 
                }}
              >
                Zur Startseite
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
