// src/components/AddRoomModal.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Grid, FormControlLabel, Checkbox,
  Typography, MenuItem, Avatar, CircularProgress
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import api from '../services/api';

interface AddRoomModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AMENITY_OPTIONS = ["แอร์", "เฟอร์นิเจอร์", "เครื่องทำน้ำอุ่น", "Wifi", "ที่จอดรถ", "TV", "ตู้เย็น"];

const AddRoomModal: React.FC<AddRoomModalProps> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    room_number: '',
    room_type: 'Studio Standard',
    price: '',
    promotion: '',
    building: '',   // ⭐ ตึก
    floor: '',      // ⭐ ชั้น
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAmenityChange = (item: string) => {
    setAmenities(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!image) return alert("กรุณาอัปโหลดรูปห้องพัก");
    if (!formData.room_number || !formData.price || !formData.building || !formData.floor) {
      return alert("กรุณากรอก เลขห้อง, ราคา, ตึก และชั้น ให้ครบ");
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('room_number', formData.room_number);
      submitData.append('room_type', formData.room_type);
      submitData.append('price', formData.price);
      submitData.append('promotion', formData.promotion);
      submitData.append('building', formData.building); // ⭐ ส่งไป backend
      submitData.append('floor', formData.floor);       // ⭐ ส่งไป backend
      submitData.append('amenities', JSON.stringify(amenities));
      submitData.append('file', image);

      await api.post('/rooms/', submitData);

      alert("✅ เพิ่มห้องพักสำเร็จ!");
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        room_number: '',
        room_type: 'Studio Standard',
        price: '',
        promotion: '',
        building: '',
        floor: '',
      });
      setAmenities([]);
      setImage(null);
      setPreview('');

    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || "เกิดข้อผิดพลาดในการบันทึก";
      alert(`❌ ผิดพลาด: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>เพิ่มห้องพักใหม่</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            {/* รูปภาพ */}
            <Grid item xs={12} textAlign="center">
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={preview}
                  variant="rounded"
                  sx={{ width: 150, height: 100, mb: 1, border: '1px dashed grey' }}
                >
                  รูปห้อง
                </Avatar>
              </Box>
              <br />
              <Button component="label" variant="outlined" size="small" startIcon={<CloudUpload />}>
                อัปโหลดรูป
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              </Button>
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="เลขห้อง *"
                name="room_number"
                fullWidth
                required
                onChange={handleChange}
                value={formData.room_number}
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="ตึก *"
                name="building"
                fullWidth
                required
                onChange={handleChange}
                value={formData.building}
                placeholder="เช่น A, B, C"
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="ชั้น *"
                name="floor"
                type="number"
                fullWidth
                required
                onChange={handleChange}
                value={formData.floor}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                select
                label="ประเภทห้อง"
                name="room_type"
                fullWidth
                value={formData.room_type}
                onChange={handleChange}
              >
                {['Studio Standard', 'Studio Deluxe', '1 Bedroom Suite', '2 Bedroom'].map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="ราคา (บาท/เดือน) *"
                name="price"
                type="number"
                fullWidth
                required
                onChange={handleChange}
                value={formData.price}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="โปรโมชั่น (ถ้ามี)"
                name="promotion"
                fullWidth
                onChange={handleChange}
                value={formData.promotion}
                placeholder="เช่น ลด 500 บาท"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>สิ่งอำนวยความสะดวก:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                {AMENITY_OPTIONS.map(opt => (
                  <FormControlLabel
                    key={opt}
                    control={<Checkbox checked={amenities.includes(opt)} onChange={() => handleAmenityChange(opt)} />}
                    label={opt}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">ยกเลิก</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          {loading ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddRoomModal;
