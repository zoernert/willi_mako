import React, { ReactNode } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  Container,
  Paper,
} from '@mui/material';
import {
  QuestionAnswer as FAQIcon,
  ElectricBolt as EnergyIcon,
  Menu as MenuIcon,
  Home as HomeIcon,
  Info as InfoIcon,
  Api as ApiIcon,
  PhotoCamera as PhotoIcon,
  Description as DescriptionIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

const drawerWidth = 240;

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = "Wissensplattform" }) => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Startseite', icon: <HomeIcon />, path: '/' },
    { text: 'Wissensdatenbank', icon: <FAQIcon />, path: '/wissen' },
  { text: 'Fachartikel', icon: <DescriptionIcon />, path: '/wissen/artikel' },
  { text: 'Daten', icon: <StorageIcon />, path: '/data' },
    { text: 'Screenshot-Analyse', icon: <PhotoIcon />, path: '/screenshot-analysis' },
    { text: 'MCP Service API', icon: <ApiIcon />, path: '/mcp-service' },
    { text: 'Beratung', icon: <InfoIcon />, path: '/beratung' },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  const drawer = (
    <Box>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 36, height: 36, position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/logo.png"
            alt="Willi-Mako"
            width={36}
            height={36}
            style={{ objectFit: 'contain' }}
          />
        </Box>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={isActivePath(item.path)}
              onClick={() => {
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
      
      {/* Quick Access Tools */}
      <Divider sx={{ mt: 2, mb: 2 }} />
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, display: 'block', mb: 1 }}>
          Quick Access
        </Typography>
        <ListItemButton
          component={Link}
          href="/screenshot-analysis"
          sx={{ 
            borderRadius: 2, 
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            py: 1,
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
        >
          <ListItemIcon>
            <PhotoIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Screenshot-Tool"
            secondary="Codes extrahieren"
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItemButton>
      </Box>
      
      <Divider sx={{ mt: 2 }} />
      <Box sx={{ p: 2 }}>
        <ListItemButton
          component={Link}
          href="/app/login"
          sx={{ 
            borderRadius: 2, 
            bgcolor: '#ee7f4b',
            color: 'white',
            py: 1.5,
            '&:hover': {
              bgcolor: '#d66d3a'
            },
            '& .MuiListItemIcon-root': {
              color: 'white'
            }
          }}
        >
          <ListItemIcon>
            <EnergyIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Willi-Mako App"
          />
        </ListItemButton>
      </Box>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ width: 28, height: 28, flex: '0 0 auto' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/media/logo.png"
                alt="Willi-Mako"
                width={28}
                height={28}
                style={{ objectFit: 'contain' }}
              />
            </Box>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, minWidth: 0 }}>
              {title}
            </Typography>
          </Box>
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
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ py: 4, flexGrow: 1 }}>
          {children}
        </Container>
        
        {/* Footer */}
        <Paper 
          component="footer"
          elevation={1}
          sx={{ 
            mt: 'auto',
            py: 3,
            px: 2,
            backgroundColor: 'grey.50'
          }}
        >
          <Container maxWidth="lg">
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
                <Link href="/data" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                    Daten
                  </Typography>
                </Link>
                <Link href="/impressum" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                    Impressum
                  </Typography>
                </Link>
                <Link href="/datenschutz" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                    Datenschutz
                  </Typography>
                </Link>
                <Link href="/nutzungsbedingungen" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                    Nutzungsbedingungen
                  </Typography>
                </Link>
                <Link href="/app/login" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                    Zur Anwendung
                  </Typography>
                </Link>
              </Box>
            </Box>
          </Container>
        </Paper>
      </Box>
    </Box>
  );
};

export default Layout;
