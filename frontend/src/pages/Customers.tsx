import React from 'react';
import { Typography } from '@mui/material';

export default function Customers() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Customers
      </Typography>
      <Typography>
        Here you will be able to add new customers and manage their services. Each customer can subscribe to multiple services. Deletion of customer records is not allowed.
      </Typography>
    </div>
  );
}
