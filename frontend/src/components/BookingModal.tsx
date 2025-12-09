// src/components/BookingModal.tsx
import React, { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
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
  Alert,
  Tabs,
  Tab,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  CameraAlt as CameraIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ---------------- Helper: Base64 → File ----------------
const dataURLtoFile = (dataurl: string, filename: string) => {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

// ---------------- Helper: ตรวจเลขบัตร / Passport ----------------
const validateIdentity = (
  id: string
): { isValid: boolean; type: string; message: string } => {
  if (!id) return { isValid: false, type: "", message: "" };

  const passportRegex = /^[A-Z0-9]{7,9}$/; // เดาเลข Passport
  const thaiIdRegex = /^\d{13}$/; // บัตร ปชช. 13 หลัก

  if (thaiIdRegex.test(id)) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseFloat(id.charAt(i)) * (13 - i);
    }
    const check = (11 - (sum % 11)) % 10;
    if (check === parseFloat(id.charAt(12))) {
      return { isValid: true, type: "Thai ID", message: "" };
    } else {
      return {
        isValid: false,
        type: "Thai ID",
        message: "เลขบัตรประชาชนไม่ถูกต้อง (Check Digit ผิด)",
      };
    }
  } else if (passportRegex.test(id)) {
    return { isValid: true, type: "Passport", message: "" };
  }

  return {
    isValid: false,
    type: "Unknown",
    message: "รูปแบบไม่ถูกต้อง (ต้องเป็นเลข 13 หลัก หรือ Passport)",
  };
};

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  room: any;
}

const BookingModal: React.FC<BookingModalProps> = ({ open, onClose, room }) => {
  const { user } = useAuth();
  const webcamRef = useRef<Webcam>(null);

  // UI State
  const [activeTab, setActiveTab] = useState(0); // 0 = upload, 1 = camera
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // โหลด AI OCR
  const [submitLoading, setSubmitLoading] = useState(false); // โหลดตอนส่งจอง
  const [aiResult, setAiResult] = useState<{ id: string; conf: number } | null>(
    null
  );
  const [idError, setIdError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: user?.user_name || "",
    last_name: "",
    phone: "",
    id_card_number: "",
  });

  // ---------------- Capture จากกล้อง ----------------
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
      const file = dataURLtoFile(imageSrc, "webcam-capture.jpg");
      processImage(file);
    }
  }, []);

  // ---------------- Upload file ----------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImgSrc(URL.createObjectURL(file));
      processImage(file);
    }
  };

  // ---------------- ส่งรูปไปให้ Backend OCR ----------------
  const processImage = async (file: File) => {
    setLoading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const res = await api.post("/ai/ocr/id-card", formDataUpload, {
        // headers: { "Content-Type": "multipart/form-data" },
      });

      const {
        detected_id_card,
        id_type,
        thai_first_name,
        thai_last_name,
        eng_first_name,
        eng_last_name,
      } = res.data;

      if (detected_id_card) {
        // เลือกชื่อที่เหมาะตามชนิดของเอกสาร
        let newFirst = formData.first_name;
        let newLast = formData.last_name;

        if (id_type === "thai_id") {
          if (thai_first_name) newFirst = thai_first_name;
          if (thai_last_name) newLast = thai_last_name;
        } else if (id_type === "passport") {
          if (eng_first_name) newFirst = eng_first_name;
          if (eng_last_name) newLast = eng_last_name;
        }

        setFormData((prev) => ({
          ...prev,
          id_card_number: detected_id_card,
          first_name: newFirst,
          last_name: newLast,
        }));

        setAiResult({ id: detected_id_card, conf: 100 });

        // ตรวจเลขที่ได้
        const validation = validateIdentity(detected_id_card);
        setIdError(validation.isValid ? null : validation.message);
      } else {
        alert("AI อ่านภาพได้ แต่ไม่พบเลขบัตร กรุณากรอกเอง");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- เปลี่ยนค่าฟอร์ม ----------------
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "id_card_number") {
      // ให้รองรับทั้งตัวเลขและตัวอักษรใหญ่ (สำหรับ Passport)
      newValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

      const validation = validateIdentity(newValue);
      if (newValue.length >= 7 && !validation.isValid) {
        setIdError(validation.message);
      } else {
        setIdError(null);
      }
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  // ---------------- Submit คำขอจอง ----------------
  const handleSubmit = async () => {
    if (!room) return;

    const validation = validateIdentity(formData.id_card_number);
    if (!validation.isValid) {
      alert(`ไม่สามารถจองได้: ${validation.message}`);
      return;
    }

    if (!imgSrc) {
      alert("กรุณาอัปโหลดหรือถ่ายรูปบัตรประชาชน / Passport ก่อน");
      return;
    }

    try {
      setSubmitLoading(true);

      const submitData = new FormData();
      submitData.append("room_id", String(room.id));
      submitData.append("first_name", formData.first_name);
      submitData.append("last_name", formData.last_name);
      submitData.append("phone", formData.phone);
      submitData.append("id_card_number", formData.id_card_number);

      // แนบไฟล์รูปบัตร
      if (imgSrc.startsWith("data:")) {
        submitData.append("file", dataURLtoFile(imgSrc, "id_card.jpg"));
      } else {
        const blob = await (await fetch(imgSrc)).blob();
        submitData.append("file", blob, "uploaded.jpg");
      }

      // ✅ เรียก backend ให้ตรงกับ FastAPI: POST /bookings/submit
      const res = await api.post("/bookings/submit", submitData, {
      });
      console.log("booking created:", res.data);

      alert(`🎉 ส่งคำขอจองสำเร็จ! (ระบุตัวตนด้วย: ${validation.type})`);

      // เคลียร์สถานะเล็กน้อยก่อนปิด
      setAiResult(null);
      setImgSrc(null);
      setIdError(null);

      onClose();
    } catch (err: any) {
      console.error(err);
      alert(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "เกิดข้อผิดพลาดในการจอง"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // ---------------- Render ----------------
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pr: 2,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            จองห้องพัก: {room?.room_number} ({room?.room_type})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            กรุณาตรวจสอบข้อมูลผู้จองให้ถูกต้องก่อนยืนยันการจอง
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 3, pb: 3 }}>
        <Grid container spacing={3}>
          {/* ---------- ซ้าย: รูปบัตร + กล้อง/อัปโหลด + สถานะ AI ---------- */}
          <Grid item xs={12} md={5}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              {/* Tabs บนการ์ด */}
              <Tabs
                value={activeTab}
                onChange={(e, v) => setActiveTab(v)}
                variant="fullWidth"
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  "& .MuiTab-root": { minHeight: 40 },
                }}
              >
                <Tab icon={<CloudUploadIcon />} label="อัปโหลดรูป" />
                <Tab icon={<CameraIcon />} label="ถ่ายรูปบัตร" />
              </Tabs>

              {/* พื้นที่แสดงภาพ / กล้อง */}
              <Box
                sx={{
                  bgcolor: "#000",
                  height: 260,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {activeTab === 1 && !imgSrc ? (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width="100%"
                    height="100%"
                    videoConstraints={{ facingMode: "environment" }}
                  />
                ) : imgSrc ? (
                  <CardMedia
                    component="img"
                    image={imgSrc}
                    alt="ID Preview"
                    sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <Typography color="white" fontSize={14}>
                    กรุณาเลือกรูป หรือถ่ายรูปบัตรประชาชน / Passport
                  </Typography>
                )}
              </Box>

              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1}>
                    {activeTab === 0 && (
                      <Button
                        component="label"
                        variant="contained"
                        fullWidth
                        startIcon={<CloudUploadIcon />}
                      >
                        เลือกไฟล์
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleFileUpload}
                        />
                      </Button>
                    )}

                    {activeTab === 1 && !imgSrc && (
                      <Button
                        variant="contained"
                        color="warning"
                        fullWidth
                        startIcon={<CameraIcon />}
                        onClick={capture}
                      >
                        ถ่ายรูป
                      </Button>
                    )}

                    {imgSrc && (
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        onClick={() => {
                          setImgSrc(null);
                          setAiResult(null);
                          setIdError(null);
                        }}
                      >
                        ถ่ายใหม่ / เลือกใหม่
                      </Button>
                    )}
                  </Stack>

                  {/* สถานะโหลด AI */}
                  {loading && (
                    <Box textAlign="center">
                      <CircularProgress size={22} />
                      <Typography mt={1} variant="body2">
                        AI กำลังอ่านข้อมูลจากบัตร...
                      </Typography>
                    </Box>
                  )}

                  {/* สถานะ AI */}
                  {!loading && (
                    <>
                      {aiResult ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label={`AI อ่านสำเร็จ: ${aiResult.id}`}
                          color="success"
                          variant="outlined"
                          sx={{ justifyContent: "flex-start" }}
                        />
                      ) : (
                        <Chip
                          icon={<WarningAmberIcon />}
                          label="อัปโหลดรูปบัตร เพื่อให้ AI ช่วยกรอกข้อมูลอัตโนมัติ"
                          variant="outlined"
                          sx={{ justifyContent: "flex-start" }}
                        />
                      )}
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* ---------- ขวา: ฟอร์มข้อมูลผู้จอง ---------- */}
          <Grid item xs={12} md={7}>
            <Box mb={1.5}>
              <Typography variant="subtitle1" fontWeight="bold">
                ข้อมูลผู้จอง
              </Typography>
              <Typography variant="body2" color="text.secondary">
                กรอกข้อมูลให้ตรงกับบัตรประชาชนหรือ Passport
              </Typography>
            </Box>

            <Box
              component="form"
              display="flex"
              flexDirection="column"
              gap={2}
              mt={1}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="ชื่อจริง"
                    fullWidth
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="นามสกุล"
                    fullWidth
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="เบอร์โทรศัพท์"
                    fullWidth
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="เลขบัตรประชาชน / Passport No."
                    fullWidth
                    name="id_card_number"
                    value={formData.id_card_number}
                    onChange={handleInputChange}
                    placeholder="เช่น 1100012345678 หรือ AA1234567"
                    focused={!!formData.id_card_number}
                    error={!!idError}
                    helperText={
                      idError ||
                      "รองรับทั้งบัตรประชาชนไทย (13 หลัก) และ Passport (7–9 ตัวอักษร/ตัวเลข)"
                    }
                    size="small"
                  />
                </Grid>
              </Grid>

              {idError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {idError}
                </Alert>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                * ข้อมูลนี้จะใช้ในการออกสัญญาเช่าห้องและตรวจสอบตัวตนของผู้เช่า
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f9fafb" }}>
        <Button onClick={onClose} color="secondary" disabled={submitLoading}>
          ยกเลิก
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          size="large"
          disabled={
            submitLoading ||
            !formData.id_card_number ||
            !imgSrc ||
            !!idError ||
            loading
          }
          startIcon={submitLoading ? <CircularProgress size={18} /> : undefined}
        >
          {submitLoading ? "กำลังส่งคำขอ..." : "ยืนยันการจอง"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookingModal;
