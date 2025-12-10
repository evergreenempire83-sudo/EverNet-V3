import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Typography, Box, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip
} from '@mui/material';
import {
  TrendingUp,
  Visibility,
  AttachMoney,
  VideoLibrary
} from '@mui/icons-material';
import { EarningsCard } from '../components/Dashboard/EarningsCard';
import { getCreatorDoc } from '../firebase/firestore';
import { onAuthChange } from '../firebase/auth';
import { Creator } from '../types';

const Dashboard: React.FC = () => {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        // Fetch creator data
        // This is a placeholder - implement actual data fetching
        setCreator({
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Creator',
          youtubeChannelId: '',
          tier: 'basic',
          referralCode: 'ABC123',
          joinedDate: new Date(),
          status: 'active',
          balance: {
            available: 25.50,
            locked: 100.50,
            totalEarned: 156.78
          }
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Earnings Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <EarningsCard
            title="Available Balance"
            value={creator?.balance.available || 0}
            icon={<AttachMoney />}
            color="#4CAF50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <EarningsCard
            title="Total Views"
            value="15.2K"
            change={12}
            icon={<Visibility />}
            color="#2196F3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <EarningsCard
            title="Premium Views"
            value="1.1K"
            change={8}
            icon={<TrendingUp />}
            color="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <EarningsCard
            title="Videos Tracked"
            value="24"
            change={3}
            icon={<VideoLibrary />}
            color="#9C27B0"
          />
        </Grid>

        {/* Recent Videos */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Videos
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Video</TableCell>
                    <TableCell>Views</TableCell>
                    <TableCell>Premium Views</TableCell>
                    <TableCell>Earnings</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Funny Cat Video</TableCell>
                    <TableCell>12,456</TableCell>
                    <TableCell>872</TableCell>
                    <TableCell>$0.26</TableCell>
                    <TableCell>
                      <Chip label="Active" color="success" size="small" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cooking Hack</TableCell>
                    <TableCell>8,923</TableCell>
                    <TableCell>625</TableCell>
                    <TableCell>$0.19</TableCell>
                    <TableCell>
                      <Chip label="Active" color="success" size="small" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
