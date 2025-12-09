// src/pages/PaymentForm.tsx
import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Paper,
  Divider,
  Stack,
} from "@mui/material";
import api from "../services/api";

interface PaymentFormProps {
  contractId: number;
  depositAmount?: number;
  onSuccess?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  contractId,
  depositAmount,
  onSuccess,
}) => {
  const [bankName, setBankName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [payerName, setPayerName] = useState("");
  const [slipImage, setSlipImage] = useState<File | null>(null);

  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ---------- helper เล็ก ๆ ----------
  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // cleanup object URL เวลา component หายไป
  useEffect(() => {
    return () => {
      if (slipPreview) {
        URL.revokeObjectURL(slipPreview);
      }
    };
  }, [slipPreview]);

  // ---------- เลือกไฟล์ + OCR ----------
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearMessages();

    // ✅ รับเฉพาะรูปภาพเท่านั้น (ไม่รับ PDF)
    if (!file.type.startsWith("image/")) {
      setError("รองรับเฉพาะไฟล์รูปภาพเท่านั้น (JPG / PNG)");
      return;
    }

    // ล้าง preview เดิม หากมี
    if (slipPreview) {
      URL.revokeObjectURL(slipPreview);
    }

    setSlipImage(file);
    const url = URL.createObjectURL(file);
    setSlipPreview(url);

    // ถ้ามี endpoint OCR ก็ลองเรียก ถ้า error ก็ให้กรอกเอง
    try {
      setOcrLoading(true);

      const fd = new FormData();
      fd.append("file", file);

      const res = await api.post("/ai/ocr-slip", fd);
      const data = res.data || {};

      if (data.bank_name) setBankName(String(data.bank_name));
      if (data.reference_number)
        setReferenceNumber(String(data.reference_number));
      if (data.amount) setAmountPaid(String(data.amount));
      if (data.payer_name) setPayerName(String(data.payer_name));

      setSuccessMessage(
        "อ่านข้อมูลจากสลิปสำเร็จ กรุณาตรวจสอบ/แก้ไขข้อมูลก่อนยืนยัน"
      );
    } catch (err) {
      console.error("OCR error:", err);
      setError("ไม่สามารถอ่านข้อมูลจากสลิปได้ กรุณากรอกข้อมูลด้วยตนเอง");
    } finally {
      setOcrLoading(false);
    }
  };

  // ---------- ส่งข้อมูล ----------
  const handleSubmit = async () => {
    clearMessages();

    const bankNameTrim = bankName.trim();
    const refTrim = referenceNumber.trim();
    const payerTrim = payerName.trim();
    const amountStr = amountPaid.trim();

    if (!bankNameTrim || !refTrim || !amountStr || !payerTrim || !slipImage) {
      setError("กรุณากรอกข้อมูลและแนบสลิปให้ครบถ้วน");
      return;
    }

    const amount = Number(amountStr);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("จำนวนเงินต้องมากกว่า 0");
      return;
    }

    if (depositAmount && amount !== depositAmount) {
      setError(
        `ยอดโอน (${amount.toLocaleString("th-TH")} บาท) ไม่ตรงกับยอดมัดจำ (${depositAmount.toLocaleString(
          "th-TH"
        )} บาท)`
      );
      return;
    }

    const formData = new FormData();
    formData.append("contractId", String(contractId));
    formData.append("bankName", bankNameTrim);
    formData.append("referenceNumber", refTrim);
    formData.append("amountPaid", amount.toString());
    formData.append("payerName", payerTrim);
    formData.append("slipImage", slipImage);

    try {
      setSubmitting(true);
      await api.post("/payments/create", formData);

      setSuccessMessage("ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว");

      // reset ฟอร์ม
      setBankName("");
      setReferenceNumber("");
      setAmountPaid("");
      setPayerName("");
      setSlipImage(null);

      if (slipPreview) {
        URL.revokeObjectURL(slipPreview);
      }
      setSlipPreview(null);

      onSuccess?.();
    } catch (err: any) {
      console.error("Error submitting payment:", err);

      const detail = err?.response?.data?.detail;
      let msg: string;

      if (Array.isArray(detail)) {
        msg =
          detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ") ||
          "เกิดข้อผิดพลาดในการส่งข้อมูล";
      } else {
        msg =
          detail ||
          err?.response?.data?.message ||
          "เกิดข้อผิดพลาดในการส่งข้อมูล";
      }

      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- UI ----------
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "grey.200",
        bgcolor: "grey.50",
      }}
    >
      <Stack spacing={1} mb={2}>
        <Typography variant="h6" fontWeight="bold">
          แนบหลักฐานการชำระเงิน
        </Typography>
        <Typography variant="body2" color="text.secondary">
          รองรับเฉพาะไฟล์รูปภาพ (JPG / PNG) ไม่รองรับ PDF
        </Typography>
        {depositAmount && (
          <Typography variant="body2" color="primary">
            ยอดมัดจำ: {depositAmount.toLocaleString("th-TH")} บาท
          </Typography>
        )}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="ชื่อธนาคาร"
            fullWidth
            size="small"
            value={bankName}
            onChange={(e) => {
              setBankName(e.target.value);
              clearMessages();
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="เลขที่อ้างอิง"
            fullWidth
            size="small"
            value={referenceNumber}
            onChange={(e) => {
              setReferenceNumber(e.target.value);
              clearMessages();
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="จำนวนเงินที่โอน"
            fullWidth
            size="small"
            value={amountPaid}
            onChange={(e) => {
              setAmountPaid(e.target.value);
              clearMessages();
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="ชื่อผู้โอน"
            fullWidth
            size="small"
            value={payerName}
            onChange={(e) => {
              setPayerName(e.target.value);
              clearMessages();
            }}
          />
        </Grid>
      </Grid>

      {/* กล่องแนบรูปสลิป */}
      <Box
        mt={3}
        p={2.5}
        textAlign="center"
        sx={{
          borderRadius: 2,
          border: "1px dashed",
          borderColor: "grey.400",
          bgcolor: "grey.100",
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          เลือกไฟล์สลิป (เฉพาะรูปภาพ JPG / PNG)
        </Typography>

        <Button component="label" variant="outlined" disabled={ocrLoading}>
          เลือกรูปสลิป
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileUpload}
          />
        </Button>

        {ocrLoading && (
          <Typography mt={1} variant="body2" color="text.secondary">
            กำลังอ่านสลิป...
          </Typography>
        )}

        {slipPreview && (
          <Box mt={2} display="flex" justifyContent="center">
            <Box
              sx={{
                maxWidth: 360,
                width: "100%",
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: 1,
                bgcolor: "white",
              }}
            >
              <img
                src={slipPreview}
                alt="Slip Preview"
                style={{ width: "100%", display: "block" }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Button
        fullWidth
        sx={{ mt: 3, py: 1.1 }}
        variant="contained"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <CircularProgress size={22} /> : "ยืนยันการชำระเงิน"}
      </Button>
    </Paper>
  );
};

export default PaymentForm;
