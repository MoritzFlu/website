import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import LanIcon from '@mui/icons-material/Lan';
import { useNavigate, useLocation } from 'react-router-dom';

const pages = [
  { label: 'Home',         path: '/' },
  { label: 'Network Demo', path: '/sim' },
  { label: 'Publications', path: null },
  { label: 'Projects',     path: null },
  { label: 'About Me',     path: null },
];

function NavBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>

          <LanIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
          <Box
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 500,
              fontSize: '1.25rem',
              letterSpacing: '.1rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            UNDER CONSTRUCTION: Moritz Flüchter
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {pages.map((p) => (
              <Button
                key={p.label}
                onClick={() => p.path && navigate(p.path)}
                sx={{
                  my: 2, color: 'white', display: 'block',
                  textDecoration: pathname === p.path ? 'underline' : 'none',
                  opacity: p.path ? 1 : 0.5,
                }}
              >
                {p.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Thats me!">
              <Avatar alt="Moritz Flüchter" src="/me.jpg" />
            </Tooltip>
          </Box>

        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default NavBar;
