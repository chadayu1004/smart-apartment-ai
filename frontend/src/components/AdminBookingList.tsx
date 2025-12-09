// src/components/AdminBookingList.tsx
import React, { useEffect, useState } from 'react';
import { 
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Button, Chip, Typography, Box, Stack, Tooltip
} from '@mui/material';
import { 
  CheckCircle, Cancel, Block as BlockIcon, Check as CheckIcon, 
  AccessTime as PendingIcon 
} from '@mui/icons-material';
import api from '../services/api';

interface Booking {
  id: number;
  room_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  id_card_number: string;
  ai_status: string;
  ai_confidence: number;
  ai_remark: string;
  status: string; // pending, approved, rejected
}

const AdminBookingList = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/');
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // ฟังก์ชันอนุมัติ
  const handleApprove = async (id: number) => {
    if (!confirm("ยืนยันการอนุมัติ? ระบบจะสร้างข้อมูลผู้เช่าให้อัตโนมัติ")) return;
    try {
      await api.post(`/bookings/${id}/approve`);
      alert("✅ อนุมัติเรียบร้อย!");
      fetchBookings();
    } catch (err) {
      alert("Error: " + err);
    }
  };

  // ฟังก์ชันปฏิเสธ
  const handleReject = async (id: number) => {
    if (!confirm("ต้องการ 'ปฏิเสธ' คำขอนี้ใช่หรือไม่?")) return;
    try {
      await api.post(`/bookings/${id}/reject`);
      alert("❌ ปฏิเสธคำขอเรียบร้อย");
      fetchBookings();
    } catch (err) {
      alert("Error: " + err);
    }
  };

  // เฉพาะรายการที่ยังรออนุมัติ
  const pendingBookings = bookings.filter(b => b.status === 'pending');

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <PendingIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          คำขอจองห้องพัก (Pending Requests)
        </Typography>
        <Chip label={pendingBookings.length} color="primary" size="small" />
      </Box>

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#e3f2fd' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>ห้อง</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>ผู้จอง</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>ข้อมูลติดต่อ</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>ผลตรวจ AI</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingBookings.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                   -- ไม่มีรายการคำขอจองใหม่ --
                 </TableCell>
               </TableRow>
            ) : (
              pendingBookings.map((booking) => (
                <TableRow key={booking.id} hover>
                  <TableCell>
                    <Chip label={`ห้อง ${booking.room_id}`} color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">{booking.first_name} {booking.last_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" display="block">📞 {booking.phone}</Typography>
                    <Typography variant="caption" color="text.secondary">🆔 {booking.id_card_number}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={booking.ai_remark || "ไม่มีหมายเหตุ"}>
                        {booking.ai_status === 'pass' ? (
                          <Chip icon={<CheckCircle />} label={`ผ่าน (${booking.ai_confidence}%)`} color="success" size="small" />
                        ) : (
                          <Chip icon={<Cancel />} label={`ไม่ชัดเจน (${booking.ai_confidence}%)`} color="warning" size="small" />
                        )}
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button 
                        variant="contained" 
                        color="success" 
                        size="small"
                        startIcon={<CheckIcon />}
                        onClick={() => handleApprove(booking.id)}
                      >
                        อนุมัติ
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="error" 
                        size="small"
                        startIcon={<BlockIcon />}
                        onClick={() => handleReject(booking.id)}
                      >
                        ไม่อนุมัติ
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdminBookingList;