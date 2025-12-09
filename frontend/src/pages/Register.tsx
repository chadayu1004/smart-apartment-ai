// src/pages/Register.tsx
import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Grid } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import PDPAConsentDialog from '../components/PDPAConsentDialog';
import { useAuth } from '../context/AuthContext';   // ✅ ดึงข้อมูล user/role

const Register = () => {
  const navigate = useNavigate();
  const { user } = useAuth();                      // ✅ เช็คว่าเป็น admin ไหม
  const isAdmin = user?.user_role === 'admin';

  // State สำหรับ Popup PDPA
  const [openPDPA, setOpenPDPA] = useState(false);

  // เพิ่ม username ใน state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 1. กดปุ่มสมัคร -> แค่เปิด PDPA (ยังไม่สมัครจริง)
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('รหัสผ่านไม่ตรงกัน');
      return;
    }
    setOpenPDPA(true); // เปิด Popup
  };

  // 2. ฟังก์ชันสมัครจริง (จะถูกเรียกเมื่อกดยอมรับใน PDPA)
  const handleConfirmRegister = async () => {
    setOpenPDPA(false); // ปิด Popup
    try {
      await api.post('/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone
      });
      alert(isAdmin ? 'เพิ่มผู้เช่าใหม่สำเร็จ!' : 'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');

      // ถ้าเป็น admin เพิ่มผู้เช่าเสร็จ -> กลับไปหน้า dashboard
      if (isAdmin) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
      alert(msg);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5, pb: 5 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        {/* ✅ เปลี่ยนหัวข้อ ตาม role */}
        <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
          {isAdmin ? 'เพิ่มผู้เช่าใหม่' : 'สมัครสมาชิกใหม่'}
        </Typography>

        {/* ข้อความอธิบายเล็ก ๆ สำหรับ admin */}
        {isAdmin && (
          <Typography align="center" color="text.secondary" sx={{ mb: 2 }}>
            ผู้ดูแลระบบกำลังเพิ่มบัญชีผู้เช่าเข้าสู่ระบบ
          </Typography>
        )}

        <Box component="form" onSubmit={handlePreSubmit}>
          <Grid container spacing={2}>
            {/* --- Username --- */}
            <Grid item xs={12}>
              <TextField
                label="ชื่อผู้ใช้งาน (Username)"
                name="username"
                fullWidth
                required
                placeholder="ภาษาอังกฤษ (สำหรับใช้ล็อกอิน)"
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="ชื่อจริง"
                name="first_name"
                fullWidth
                required
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="นามสกุล"
                name="last_name"
                fullWidth
                required
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="อีเมล"
                name="email"
                type="email"
                fullWidth
                required
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="เบอร์โทรศัพท์ *"
                name="phone"
                fullWidth
                required
                type="tel"
                placeholder="0812345678"
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="รหัสผ่าน"
                name="password"
                type="password"
                fullWidth
                required
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="ยืนยันรหัสผ่าน"
                name="confirmPassword"
                type="password"
                fullWidth
                required
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="success"
            size="large"
            sx={{ mt: 3, mb: 2 }}
          >
            {isAdmin ? 'บันทึกผู้เช่าใหม่' : 'สมัครสมาชิก'}
          </Button>

          {/* ลิงก์ไปหน้า Login แสดงเฉพาะตอนเป็น guest */}
          {!isAdmin && (
            <Box textAlign="center">
              <Typography variant="body2">
                มีบัญชีอยู่แล้ว?{' '}
                <Link to="/login" style={{ textDecoration: 'none', color: '#1976d2' }}>
                  เข้าสู่ระบบ
                </Link>
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* PDPA Popup */}
      <PDPAConsentDialog
        open={openPDPA}
        onClose={() => setOpenPDPA(false)}
        onConfirm={handleConfirmRegister}
        actionName={isAdmin ? 'เพิ่มผู้เช่าใหม่' : 'สมัครสมาชิก'}
      />
    </Container>
  );
};

export default Register;
