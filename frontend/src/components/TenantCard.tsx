// src/components/TenantCard.tsx
import React from 'react';
import { Card, CardContent, Box, Typography, Chip, Stack, Avatar, Grid } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

// --- ใส่ Interface ไว้ตรงนี้เลย (ไม่ต้อง Import) ---
interface Tenant {
  id?: number;
  first_name: string;
  last_name: string;
  phone: string;
  id_card_number: string;
  status: string;
}
// ---------------------------------------------

interface TenantCardProps {
  tenant: Tenant;
}

const TenantCard: React.FC<TenantCardProps> = ({ tenant }) => {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card sx={{ boxShadow: 3, borderRadius: 2, height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar sx={{ bgcolor: '#1976d2', mr: 2 }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" noWrap>
                {tenant.first_name} {tenant.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                โทร: {tenant.phone}
              </Typography>
            </Box>
          </Box>
          
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip 
              label={tenant.status === 'active' ? 'เช่าอยู่ปกติ' : tenant.status} 
              color={tenant.status === 'active' ? 'success' : 'default'}
              size="small"
            />
            <Typography variant="caption" color="text.secondary" noWrap>
              ID: {tenant.id_card_number}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};

export default TenantCard;