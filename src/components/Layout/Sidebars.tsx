import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemIcon, ListItemText,
  Box, Typography
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  VideoLibrary as VideosIcon,
  AttachMoney as EarningsIcon,
  Payment as WithdrawalsIcon,
  Notifications as NotificationsIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'My Videos', icon: <VideosIcon />, path: '/videos' },
  { text: 'Earnings', icon: <EarningsIcon />, path: '/earnings' },
  { text: 'Withdrawals', icon: <WithdrawalsIcon />, path: '/withdrawals' },
  { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
  { text: 'Admin', icon: <AdminIcon />, path: '/admin' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#1a1a1a',
          color: 'white',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
          🎬 EverNet
        </Typography>
      </Box>
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: '#333',
              },
              '&:hover': {
                backgroundColor: '#444',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};
