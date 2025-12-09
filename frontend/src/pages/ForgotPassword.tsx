// src/pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Alert, Stepper, Step, StepLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0); // 0=ขอรหัส, 1=ตั้งรหัสใหม่
  
  // เปลี่ยนชื่อตัวแปรจาก email เป็น contact เพื่อความชัดเจน
  const [contact, setContact] = useState(''); 
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Step 1: ขอ OTP
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      // ส่งค่า contact ไปใน field 'email' (Backend จะไปเช็คเองว่าเป็นอีเมลหรือเบอร์)
      await api.post('/auth/forgot-password', { email: contact });
      setMessage('รหัสยืนยันถูกส่งไปแล้ว! (เช็คที่ Terminal สีดำ)');
      setActiveStep(1); 
    } catch (err) {
      console.error(err);
      setError('ไม่พบข้อมูลผู้ใช้นี้ หรือเกิดข้อผิดพลาด');
    }
  };

  // Step 2: เปลี่ยนรหัส
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/reset-password', {
        email: contact,
        code,
        new_password: newPassword
      });
      alert('เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสใหม่');
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError('รหัสยืนยันไม่ถูกต้อง หรือหมดอายุ');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" align="center" gutterBottom fontWeight="bold">
          ลืมรหัสผ่าน / กู้คืนบัญชี
        </Typography>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          <Step><StepLabel>ระบุอีเมล/เบอร์โทร</StepLabel></Step>
          <Step><StepLabel>ยืนยันรหัส & ตั้งใหม่</StepLabel></Step>
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}

        {activeStep === 0 ? (
          <Box component="form" onSubmit={handleRequestCode}>
            <TextField
              label="อีเมล หรือ เบอร์โทรศัพท์ ที่ใช้สมัคร"
              fullWidth
              required
              type="text" // <--- เปลี่ยนจาก email เป็น text เพื่อให้พิมพ์เบอร์ได้
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="เช่น admin@example.com หรือ 0812345678"
              autoFocus
            />
            <Button type="submit" fullWidth variant="contained" size="large">
              ส่งรหัสยืนยัน
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleResetPassword}>
            <Typography variant="body2" gutterBottom>ส่งรหัสไปที่: <strong>{contact}</strong></Typography>
            
            <TextField
              label="รหัสยืนยัน (OTP) 6 หลัก"
              fullWidth
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="รหัสผ่านใหม่"
              fullWidth
              required
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{ mb: 3 }}
            />
            <Button type="submit" fullWidth variant="contained" color="success" size="large">
              เปลี่ยนรหัสผ่าน
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={() => setActiveStep(0)}>
              ย้อนกลับ
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ForgotPassword;