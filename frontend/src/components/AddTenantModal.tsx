// src/components/AddTenantModal.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Grid,
  CircularProgress,
  Typography,
  Alert
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import api from '../services/api';

// --- Interface (แปะไว้ตรงนี้กันเหนียว) ---
interface Tenant {
  id?: number;
  first_name: string;
  last_name: string;
  phone: string;
  id_card_number: string;
  status: string;
}

interface AddTenantModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddTenantModal: React.FC<AddTenantModalProps> = ({ open, onClose, onSuccess }) => {
  // State สำหรับฟอร์ม
  const [formData, setFormData] = useState<Tenant>({
    first_name: '',
    last_name: '',
    phone: '',
    id_card_number: '',
    status: 'active'
  });

  // State สำหรับ AI
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // --- ฟังก์ชันส่งรูปให้ AI ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    setLoading(true);
    setAiError(null);

    try {
      // เรียก API ที่เราทำไว้ใน Backend (/ai/ocr/id-card)
      // ต้องระบุ Content-Type เป็น multipart/form-data สำหรับการส่งไฟล์
      const response = await api.post('/ai/ocr/id-card', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      
      // ถ้า AI อ่านเลขบัตรได้ ให้เอามาเติมในฟอร์ม
      if (data.detected_id_card) {
        setFormData(prev => ({
          ...prev,
          id_card_number: data.detected_id_card
        }));
        alert(`AI อ่านข้อมูลสำเร็จ! (อ่านได้: ${data.detected_id_card})`);
      } else {
        setAiError("AI อ่านภาพได้ แต่หาเลขบัตรไม่เจอ กรุณาลองภาพที่ชัดขึ้น");
      }

    } catch (error) {
      console.error("AI Error:", error);
      setAiError("เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI");
    } finally {
      setLoading(false);
    }
  };

  // --- ฟังก์ชันบันทึกข้อมูล ---
  const handleSubmit = async () => {
    try {
      await api.post('/tenants/', formData);
      alert("เพิ่มผู้เช่าสำเร็จ!");
      
      // Reset Form
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        id_card_number: '',
        status: 'active'
      });
      setAiError(null);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating tenant:", error);
      alert("เกิดข้อผิดพลาดในการเพิ่มข้อมูล");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>เพิ่มผู้เช่าใหม่</DialogTitle>
      <DialogContent>
        {/* ส่วนอัปโหลดรูปภาพ AI */}
        <Box sx={{ mb: 3, p: 2, border: '1px dashed #ccc', borderRadius: 2, textAlign: 'center', bgcolor: '#f9f9f9' }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
             ✨ AI Smart Scan: อัปโหลดรูปบัตรประชาชนเพื่อกรอกอัตโนมัติ
          </Typography>
          
          <Button
            component="label"
            variant="contained"
            color="info"
            startIcon={<CloudUploadIcon />}
            disabled={loading}
          >
            {loading ? "กำลังวิเคราะห์ภาพ..." : "เลือกรูปบัตรประชาชน"}
            <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
          </Button>

          {loading && <Box mt={2}><CircularProgress size={24} /></Box>}
          
          {aiError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {aiError}
            </Alert>
          )}
        </Box>

        {/* ส่วนฟอร์มข้อมูล */}
        <Box component="form">
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                name="first_name"
                label="ชื่อจริง"
                fullWidth
                value={formData.first_name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                name="last_name"
                label="นามสกุล"
                fullWidth
                value={formData.last_name}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="id_card_number"
                label="เลขบัตรประชาชน (13 หลัก)"
                fullWidth
                value={formData.id_card_number} // ค่านี้จะเปลี่ยนเองเมื่อ AI อ่านเจอ
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }} // ให้ Label ลอยตลอดเวลา (เพราะ AI อาจเติมค่าให้)
                placeholder="อัปโหลดรูป หรือกรอกเอง"
                focused={!!formData.id_card_number} // เน้นสีเมื่อมีข้อมูล
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="phone"
                label="เบอร์โทรศัพท์"
                fullWidth
                value={formData.phone}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">ยกเลิก</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">บันทึกข้อมูล</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTenantModal;