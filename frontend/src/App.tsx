import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';

import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Services from './pages/Services';
import Expenses from './pages/Expenses';
import WhatsAppMaster from './pages/WhatsAppMaster';

export default function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Finance Tracker
          </Typography>
          <Button color="inherit" component={Link} to="/">Dashboard</Button>
          <Button color="inherit" component={Link} to="/customers">Customers</Button>
          <Button color="inherit" component={Link} to="/services">Services</Button>
          <Button color="inherit" component={Link} to="/expenses">Expenses</Button>
          <Button color="inherit" component={Link} to="/whatsapp">WhatsApp</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/services" element={<Services />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/whatsapp" element={<WhatsAppMaster />} />
        </Routes>
      </Container>
    </>
  );
}
