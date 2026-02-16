import React from 'react';
import { Typography } from '@mui/material';

export default function Dashboard() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography>
        This page will display income, expense and profit statistics using cards, tables and charts. Use the filters to specify a date range, customer, service or payment mode.
      </Typography>
    </div>
  );
}
