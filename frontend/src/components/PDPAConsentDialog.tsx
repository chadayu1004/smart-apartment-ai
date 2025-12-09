// src/components/PDPAConsentDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Box,
  Divider
} from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';

interface PDPADialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void; // ฟังก์ชันที่จะทำต่อเมื่อยอมรับแล้ว
  actionName: string;    // เช่น "สมัครสมาชิก" หรือ "จองห้องพัก"
}

const PDPAConsentDialog: React.FC<PDPADialogProps> = ({ open, onClose, onConfirm, actionName }) => {
  const [checked, setChecked] = useState(false);

  const handleConfirm = () => {
    if (checked) {
      onConfirm();
      setChecked(false); // Reset
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f5f5f5' }}>
        <SecurityIcon color="primary" />
        <Typography variant="h6" fontWeight="bold">
          ความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" paragraph>
            เพื่อความปลอดภัยและการดำเนินธุรกรรม <strong>"{actionName}"</strong> ทางหอพัก Smart Apartment ("เรา") จำเป็นต้องเก็บรวบรวม ใช้ และประมวลผลข้อมูลส่วนบุคคลของท่าน ดังนี้:
          </Typography>
          
          <Box component="ul" sx={{ pl: 2, typography: 'body2', color: 'text.secondary' }}>
            <li><strong>ข้อมูลที่จัดเก็บ:</strong> ชื่อ-นามสกุล, เบอร์โทรศัพท์, อีเมล และ <span style={{color: 'red'}}>ภาพถ่าย/ข้อมูลบนบัตรประชาชน</span> (สำหรับยืนยันตัวตนและทำสัญญา)</li>
            <li><strong>วัตถุประสงค์:</strong> เพื่อตรวจสอบยืนยันตัวตน (KYC), จัดทำสัญญาเช่าดิจิทัล, และรักษาความปลอดภัยภายในอาคาร</li>
            <li><strong>ระยะเวลา:</strong> ข้อมูลจะถูกเก็บรักษาตลอดระยะเวลาการเช่า และอีก 1 ปีหลังจากสิ้นสุดสัญญาเพื่อตรวจสอบย้อนหลัง</li>
          </Box>

          <Typography variant="body2" sx={{ mt: 2 }}>
            เราใช้เทคโนโลยี AI ในการอ่านข้อมูลจากภาพถ่ายบัตรประชาชนเพื่อความรวดเร็ว โดยระบบจะรักษาความปลอดภัยของข้อมูลตามมาตรฐานสากล และจะไม่เปิดเผยข้อมูลแก่บุคคลภายนอกโดยไม่ได้รับอนุญาต เว้นแต่เป็นการปฏิบัติตามกฎหมาย
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <FormControlLabel
          control={
            <Checkbox 
              checked={checked} 
              onChange={(e) => setChecked(e.target.checked)} 
              color="primary" 
            />
          }
          label={
            <Typography variant="body2" fontWeight="bold">
              ข้าพเจ้าได้อ่านและเข้าใจเงื่อนไข และยินยอมให้เปิดเผยข้อมูลส่วนบุคคลรวมถึงข้อมูลบัตรประชาชนเพื่อใช้ในวัตถุประสงค์ดังกล่าว
            </Typography>
          }
        />
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          ยกเลิก
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="primary" 
          disabled={!checked} // ต้องติ๊กก่อนถึงจะกดได้
        >
          ยอมรับและดำเนินการต่อ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PDPAConsentDialog;