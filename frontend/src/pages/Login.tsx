// src/pages/Login.tsx
import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Alert } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // ส่งข้อมูลเป็น Form Data ตามมาตรฐาน OAuth2
      const params = new URLSearchParams();
      params.append('username', formData.username); // Backend เราแก้ให้รับได้ทั้ง Email/Username แล้ว
      params.append('password', formData.password);

      const response = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, user_role, user_name,profile_image } = response.data;

      // บันทึกเข้าระบบ
      login(access_token, user_role, user_name, formData.username ,profile_image);

      alert('เข้าสู่ระบบสำเร็จ!');

      // ถ้าเป็น Admin ไป Dashboard, ถ้าเป็น User ไปหน้าเลือกห้อง
      if (user_role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }

    } catch (err) {
      console.error(err);
      // เปลี่ยนข้อความแจ้งเตือนให้ครอบคลุม
      setError('ชื่อผู้ใช้งาน/อีเมล หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" align="center" gutterBottom fontWeight="bold" color="primary">
          เข้าสู่ระบบ
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" mb={3}>
          ระบบจองหอพักและจัดการอพาร์ตเมนต์อัจฉริยะ
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          {/* --- แก้ไขช่องกรอก Username/Email --- */}
          <TextField
            label="ชื่อผู้ใช้งาน หรือ อีเมล"
            fullWidth
            margin="normal"
            required
            autoFocus
            type="text" // เปลี่ยนเป็น text เพื่อให้พิมพ์ Username ได้
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          {/* ----------------------------------- */}

          <TextField
            label="รหัสผ่าน"
            fullWidth
            margin="normal"
            required
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <Box textAlign="right" sx={{ mt: 1 }}>
            <Link to="/forgot-password" style={{ textDecoration: 'none', color: '#1976d2', fontSize: '0.9rem' }}>
              ลืมรหัสผ่าน?
            </Link>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1.1rem' }}
          >
            เข้าสู่ระบบ
          </Button>

          <Box textAlign="center">
            <Typography variant="body2">
              ยังไม่มีบัญชี? <Link to="/register" style={{ textDecoration: 'none', color: '#1976d2', fontWeight: 'bold' }}>สมัครสมาชิก</Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;