// src/pages/AdminMeters.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Opacity as WaterIcon,
  FlashOn as ElectricIcon,
  Sensors as MeterIcon,
} from "@mui/icons-material";
import api from "../services/api";

// ---------- types ----------
type MeterType = "water" | "electric";
type MeterStatus = "active" | "maintenance" | "inactive";

interface MeterDevice {
  id?: number;
  meter_code: string;
  meter_type: MeterType;
  room_id: number;
  room_label?: string; // เช่น "A-201" ถ้า backend ส่งมา
  image_url?: string | null;
  location_note?: string | null;
  status: MeterStatus;
  installed_at?: string | null;
  removed_at?: string | null;
}

interface LastReadingRow {
  room_label: string;
  period_label: string;
  water_reading?: number | null;
  electric_reading?: number | null;
  status: string;
}

const AdminMeters: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // รายการมิเตอร์ทั้งหมด
  const [meters, setMeters] = useState<MeterDevice[]>([]);

  // ข้อมูลจดมิเตอร์ล่าสุด
  const [lastReadings, setLastReadings] = useState<LastReadingRow[]>([]);

  // dialog เพิ่มมิเตอร์
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ข้อมูลฟอร์มเพิ่มมิเตอร์
  const [newMeter, setNewMeter] = useState<{
    meter_code: string;
    meter_type: MeterType;
    room_id: string;
    status: MeterStatus;
    location_note: string;
    installed_at: string;
    removed_at: string;
  }>({
    meter_code: "",
    meter_type: "water",
    room_id: "",
    status: "active",
    location_note: "",
    installed_at: "",
    removed_at: "",
  });

  // รูปมิเตอร์ที่เลือก + preview
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // ใช้กรณี backend ส่ง path แบบ /media/...
  const getAbsoluteUrl = (raw?: string | null) => {
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    // ปรับ base URL ตาม backend ของเรา
    return `http://localhost:8000${raw}`;
  };

  // ---------- ดึงข้อมูลจาก backend ----------
  const fetchData = async () => {
    try {
      setLoading(true);

      const [meterRes, readingRes] = await Promise.all([
        api.get<MeterDevice[]>("/meters/"),
        api.get<LastReadingRow[]>("/meters/last-readings"),
      ]);

      setMeters(meterRes.data);
      setLastReadings(readingRes.data);
    } catch (err) {
      console.error("Error fetching meter data:", err);
      // ถ้า error ก็ปล่อยเป็น array ว่าง ไม่ต้อง fix ค่า
      setMeters([]);
      setLastReadings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------- จัดการ dialog เพิ่มมิเตอร์ ----------
  const handleOpenAdd = () => {
    setNewMeter({
      meter_code: "",
      meter_type: "water",
      room_id: "",
      status: "active",
      location_note: "",
      installed_at: "",
      removed_at: "",
    });
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setAddOpen(true);
  };

  const handleCloseAdd = () => {
    if (saving) return;
    setAddOpen(false);
  };

  const handleChangeField = (
    field: keyof typeof newMeter,
    value: string
  ) => {
    setNewMeter((prev) => ({ ...prev, [field]: value }));
  };

  // เลือกรูปมิเตอร์
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกรูปภาพเท่านั้น (JPG / PNG)");
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // บันทึกมิเตอร์ใหม่ (ยิงเข้า backend จริง)
  const handleSaveMeter = async () => {
    if (!newMeter.meter_code.trim()) {
      alert("กรุณากรอกรหัสมิเตอร์");
      return;
    }
    if (!newMeter.room_id.trim()) {
      alert("กรุณากรอกหมายเลขห้อง (room_id)");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("meter_code", newMeter.meter_code.trim());
      formData.append("meter_type", newMeter.meter_type);
      formData.append("room_id", String(Number(newMeter.room_id.trim())));
      formData.append("status", newMeter.status);
      formData.append("location_note", newMeter.location_note.trim());

      if (newMeter.installed_at) {
        formData.append("installed_at", newMeter.installed_at);
      }
      if (newMeter.removed_at) {
        formData.append("removed_at", newMeter.removed_at);
      }
      if (imageFile) {
        // ให้ backend รับ field ชื่อ "image"
        formData.append("image", imageFile);
      }

      const res = await api.post<MeterDevice>("/meters/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // เพิ่มรายการใหม่จาก response จริง
      setMeters((prev) => [...prev, res.data]);

      setAddOpen(false);
    } catch (err: any) {
      console.error("Error creating meter:", err);
      alert(
        "ไม่สามารถบันทึกมิเตอร์ได้: " +
          (err?.response?.data?.detail || "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  };

  // แสดง badge สถานะ
  const renderMeterStatusChip = (status: MeterStatus) => {
    if (status === "active") {
      return <Chip size="small" color="success" label="ใช้งานอยู่" />;
    }
    if (status === "maintenance") {
      return <Chip size="small" color="warning" label="ปรับปรุง" />;
    }
    return <Chip size="small" color="default" label="ไม่ได้ใช้งาน" />;
  };

  // แปลง type ภาษาไทย
  const meterTypeLabel = (type: MeterType) =>
    type === "water" ? "น้ำ" : "ไฟฟ้า";

  // helper แสดงวันที่
  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Container maxWidth="lg">
      {/* header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mt={2}
        mb={3}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <MeterIcon color="primary" />
            มิเตอร์น้ำ / ไฟ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            จัดการข้อมูลมิเตอร์น้ำและมิเตอร์ไฟฟ้าของแต่ละห้อง
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading}
          >
            รีโหลดข้อมูล
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
          >
            เพิ่มมิเตอร์น้ำ / ไฟฟ้า
          </Button>
        </Stack>
      </Box>

      {/* การ์ดสรุปสถานะมิเตอร์น้ำ / ไฟ */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WaterIcon color="primary" />
                <Typography fontWeight="bold">สถานะมิเตอร์น้ำ</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                ภายหลังสามารถสรุปจำนวนมิเตอร์น้ำทั้งหมด / ห้องที่ยังไม่จดรอบล่าสุดได้
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <ElectricIcon color="warning" />
                <Typography fontWeight="bold">สถานะมิเตอร์ไฟฟ้า</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                ภายหลังสามารถสรุปจำนวนมิเตอร์ไฟฟ้า / ห้องที่ยังไม่จดได้
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ตารางรอบจดล่าสุด */}
      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            รายการจดมิเตอร์ล่าสุด
          </Typography>

          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ห้อง</TableCell>
                    <TableCell>รอบเดือน</TableCell>
                    <TableCell align="right">มิเตอร์น้ำ</TableCell>
                    <TableCell align="right">มิเตอร์ไฟฟ้า</TableCell>
                    <TableCell>สถานะ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lastReadings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        ยังไม่มีข้อมูลรอบจดมิเตอร์
                      </TableCell>
                    </TableRow>
                  ) : (
                    lastReadings.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.room_label}</TableCell>
                        <TableCell>{row.period_label}</TableCell>
                        <TableCell align="right">
                          {row.water_reading ?? "-"}
                        </TableCell>
                        <TableCell align="right">
                          {row.electric_reading ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color="warning"
                            label={row.status}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ตารางรายการมิเตอร์ทั้งหมด */}
      <Card sx={{ borderRadius: 3, mb: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            รายการมิเตอร์ทั้งหมด
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>รูป</TableCell>
                  <TableCell>รหัสมิเตอร์</TableCell>
                  <TableCell>ประเภท</TableCell>
                  <TableCell>ห้อง</TableCell>
                  <TableCell>ตำแหน่งติดตั้ง</TableCell>
                  <TableCell>ติดตั้งเมื่อ</TableCell>
                  <TableCell>เลิกใช้งานเมื่อ</TableCell>
                  <TableCell>สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {meters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      ยังไม่มีข้อมูลมิเตอร์
                    </TableCell>
                  </TableRow>
                ) : (
                  meters.map((m) => (
                    <TableRow key={m.id ?? m.meter_code}>
                      <TableCell>
                        {m.image_url ? (
                          <img
                            src={getAbsoluteUrl(m.image_url) || undefined}
                            alt={m.meter_code}
                            style={{
                              width: 48,
                              height: 48,
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{m.meter_code}</TableCell>
                      <TableCell>{meterTypeLabel(m.meter_type)}</TableCell>
                      <TableCell>{m.room_label ?? m.room_id}</TableCell>
                      <TableCell>{m.location_note ?? "-"}</TableCell>
                      <TableCell>{formatDate(m.installed_at)}</TableCell>
                      <TableCell>{formatDate(m.removed_at)}</TableCell>
                      <TableCell>{renderMeterStatusChip(m.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ===== Dialog เพิ่มมิเตอร์น้ำ / ไฟ + รูป ===== */}
      <Dialog open={addOpen} onClose={handleCloseAdd} maxWidth="sm" fullWidth>
        <DialogTitle>เพิ่มมิเตอร์น้ำ / ไฟฟ้า</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="รหัสมิเตอร์ (meter_code)"
              fullWidth
              value={newMeter.meter_code}
              onChange={(e) => handleChangeField("meter_code", e.target.value)}
              helperText="เช่น W-A201-01 หรือ E-A201-01"
            />

            <TextField
              select
              label="ประเภทมิเตอร์"
              fullWidth
              value={newMeter.meter_type}
              onChange={(e) =>
                handleChangeField("meter_type", e.target.value as MeterType)
              }
            >
              <MenuItem value="water">มิเตอร์น้ำ</MenuItem>
              <MenuItem value="electric">มิเตอร์ไฟฟ้า</MenuItem>
            </TextField>

            <TextField
              label="หมายเลขห้อง (room_id)"
              fullWidth
              value={newMeter.room_id}
              onChange={(e) => handleChangeField("room_id", e.target.value)}
              helperText="ภายหลังสามารถเปลี่ยนเป็น dropdown รายชื่อห้องได้"
            />

            <TextField
              select
              label="สถานะมิเตอร์"
              fullWidth
              value={newMeter.status}
              onChange={(e) =>
                handleChangeField("status", e.target.value as MeterStatus)
              }
            >
              <MenuItem value="active">ใช้งานอยู่</MenuItem>
              <MenuItem value="maintenance">ปรับปรุง / ซ่อม</MenuItem>
              <MenuItem value="inactive">ไม่ได้ใช้งาน</MenuItem>
            </TextField>

            <TextField
              label="ตำแหน่งติดตั้ง (location_note)"
              fullWidth
              value={newMeter.location_note}
              onChange={(e) =>
                handleChangeField("location_note", e.target.value)
              }
              placeholder="เช่น หน้าห้อง, ในห้องน้ำ, ระเบียง ฯลฯ"
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="วันที่ติดตั้ง (installed_at)"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newMeter.installed_at}
                onChange={(e) =>
                  handleChangeField("installed_at", e.target.value)
                }
              />
              <TextField
                label="วันที่เลิกใช้งาน (removed_at)"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newMeter.removed_at}
                onChange={(e) =>
                  handleChangeField("removed_at", e.target.value)
                }
              />
            </Stack>

            {/* เลือกรูปมิเตอร์ */}
            <Box
              sx={{
                border: "1px dashed #cbd5e1",
                borderRadius: 2,
                p: 2,
                textAlign: "center",
                bgcolor: "#f8fafc",
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                รูปมิเตอร์ (ไม่บังคับ)
              </Typography>
              <Button component="label" variant="outlined" size="small">
                เลือกรูปมิเตอร์
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </Button>
              {imagePreview && (
                <Box mt={2} display="flex" justifyContent="center">
                  <img
                    src={imagePreview}
                    alt="meter-preview"
                    style={{
                      width: 160,
                      height: 160,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                </Box>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd} disabled={saving}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveMeter}
            disabled={saving}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกมิเตอร์"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminMeters;
