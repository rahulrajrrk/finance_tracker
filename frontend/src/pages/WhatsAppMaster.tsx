import React from 'react';
import { Typography } from '@mui/material';

export default function WhatsAppMaster() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        WhatsApp Master
      </Typography>
      <Typography>
        This page lists all WhatsApp customers, their statuses, onboarding dates and next due dates. You will be able to renew services by adding the cycle duration to the next due date.
      </Typography>
    </div>
  );
}
