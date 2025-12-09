// src/pages/Profile.tsx
import React, { useState, useEffect } from 'react';
import { 
  Container, Paper, Typography, Box, Avatar, Button, TextField, Grid, Divider, Alert, CircularProgress
} from '@mui/material';
import { CloudUpload, Save, Person as PersonIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
  // ดึง updateUser มาใช้
  const { user, updateUser } = useAuth(); 
  
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    profile_image: ''
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    // ดึงค่าล่าสุดจาก Context มาใส่ใน State
    if (user) {
        // user.user_name มักจะเก็บชื่อเต็ม (First Name + Last Name)
        const nameParts = user.user_name.split(" ");
        setProfile({
            first_name: nameParts[0] || "",
            last_name: nameParts.slice(1).join(" ") || "",
            email: user.email || "",
            username: user.username || "", // สมมติว่า context มี username
            profile_image: user.profile_image || ""
        });
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
          setMessage({ type: 'error', text: 'รูปภาพต้องมีขนาดไม่เกิน 2MB' });
          return;
      }
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('first_name', profile.first_name);
      formData.append('last_name', profile.last_name);
      if (selectedImage) {
        formData.append('file', selectedImage);
      }

      // 1. ส่งข้อมูลไป Backend
      const res = await api.patch('/auth/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 2. ✅✅✅ จุดสำคัญ: สั่งอัปเดต Sidebar ทันที ✅✅✅
      const newName = `${res.data.first_name} ${res.data.last_name}`;
      const newImage = res.data.profile_image; 
      
      // เรียกใช้ฟังก์ชันจาก AuthContext เพื่อเปลี่ยนค่า Global
      if (updateUser) {
          updateUser(newName, newImage);
      }

      setMessage({ type: 'success', text: 'บันทึกข้อมูลสำเร็จ!' });
      
      // อัปเดตหน้าจอตัวเองด้วย
      setProfile(prev => ({ 
          ...prev, 
          first_name: res.data.first_name,
          last_name: res.data.last_name,
          profile_image: res.data.profile_image 
      }));
      setPreview('');

    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5, pb: 5 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" /> แก้ไขโปรไฟล์
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

        <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
          <Box position="relative">
            <Avatar 
                src={preview || profile.profile_image} 
                sx={{ width: 120, height: 120, mb: 2, border: '4px solid #e3f2fd', boxShadow: 2 }} 
            >
                {!preview && !profile.profile_image && profile.first_name ? profile.first_name.charAt(0) : <PersonIcon sx={{ fontSize: 60 }} />}
            </Avatar>
          </Box>
          
          <Button component="label" variant="outlined" size="small" startIcon={<CloudUpload />}>
            เปลี่ยนรูปโปรไฟล์
            <input type="file" hidden accept="image/*" onChange={handleImageChange} />
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            รองรับไฟล์ JPG, PNG ไม่เกิน 2MB
          </Typography>
        </Box>

        <Box component="form">
            <Grid container spacing={2}>
            <Grid item xs={6}>
                <TextField 
                label="ชื่อจริง" fullWidth 
                value={profile.first_name}
                onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                />
            </Grid>
            <Grid item xs={6}>
                <TextField 
                label="นามสกุล" fullWidth 
                value={profile.last_name}
                onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                />
            </Grid>
            <Grid item xs={12}>
                <TextField 
                label="บทบาท (Role)" fullWidth disabled 
                value={user?.user_role || 'User'} 
                variant="filled"
                />
            </Grid>
            </Grid>

            <Box mt={4}>
            <Button 
                variant="contained" 
                fullWidth 
                size="large" 
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />} 
                onClick={handleSubmit}
                disabled={loading}
            >
                {loading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </Button>
            </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile;