import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface EarningsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

export const EarningsCard: React.FC<EarningsCardProps> = ({
  title,
  value,
  change,
  icon,
  color
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {typeof value === 'number' ? `$${value.toFixed(2)}` : value}
            </Typography>
            {change !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {change >= 0 ? (
                  <TrendingUp sx={{ color: 'green', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ color: 'red', mr: 0.5 }} />
                )}
                <Typography
                  variant="body2"
                  sx={{ color: change >= 0 ? 'green' : 'red' }}
                >
                  {change >= 0 ? '+' : ''}{change}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: '50%',
              p: 1.5,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
