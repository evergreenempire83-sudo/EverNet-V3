import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, Table,
  TableBody, TableCell, TableContainer, TableHead,
  TableRow, Button, Chip, Box
} from '@mui/material';
import { 
  CheckCircle, Cancel, Pending,
  AttachMoney, People, VideoLibrary
} from '@mui/icons-material';
import { EarningsCard } from '../components/Dashboard/EarningsCard';

const Admin: React.FC = () => {
  const [pendingWithdrawals, setPendingWithdrawals] = useState([
    { id: '1', creator: 'John Doe', amount: 25.50, date: '2024-01-15' },
    { id: '2', creator: 'Jane Smith', amount: 12.75, date: '2024-01-15' },
  ]);

  const handleApprove = (id: string) => {
    setPendingWithdrawals(pendingWithdrawals.filter(w => w.id !== id));
    // TODO: Implement actual approval
  };

  const handleReject = (id: string) => {
    setPendingWithdrawals(pendingWithdrawals.filter(w => w.id !== id));
    // TODO: Implement actual rejection
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Portal
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <EarningsCard
            title="Platform Revenue"
            value={1200.50}
            icon={<AttachMoney />}
            color="#4CAF50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <EarningsCard
            title="Active Creators"
            value={156}
            icon={<People />}
            color="#2196F3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <EarningsCard
            title="Videos Tracked"
            value="2.4K"
            icon={<VideoLibrary />}
            color="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <EarningsCard
            title="Pending Withdrawals"
            value={pendingWithdrawals.length}
            icon={<Pending />}
            color="#F44336"
          />
        </Grid>

        {/* Pending Withdrawals */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Pending Withdrawals ({pendingWithdrawals.length})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Creator</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>{withdrawal.creator}</TableCell>
                      <TableCell>${withdrawal.amount.toFixed(2)}</TableCell>
                      <TableCell>{withdrawal.date}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircle />}
                            onClick={() => handleApprove(withdrawal.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Cancel />}
                            onClick={() => handleReject(withdrawal.id)}
                          >
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Admin;
