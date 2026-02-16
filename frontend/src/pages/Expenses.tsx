import React from 'react';
import { Typography } from '@mui/material';

export default function Expenses() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Expenses
      </Typography>
      <Typography>
        Manage expense categories (salary, CRM, Ads, workspace, mobile bill, etc.) and view recorded expenses. This page will provide forms for adding expenses and tables for listing them.
      </Typography>
    </div>
  );
}
