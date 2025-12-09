// src/pages/AdminDashboard.tsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  TextField,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Assignment as ContractIcon,
  Visibility as VisibilityIcon,
  Description as DescriptionIcon,
  Group as GroupIcon,
  Error as ErrorIcon,
  TaskAlt as TaskAltIcon,
} from "@mui/icons-material";
import api from "../services/api";
import DigitalClock from "../components/DigitalClock";

// ---------- types ----------
interface BookingRequest {
  id: number;
  room_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  id_card_number: string;
  ai_status: string; // pass, fail, pending, warning, error
  ai_confidence: number;
  ai_remark: string;
  status: string; // pending, approved, rejected
  created_at: string;
  id_image_url?: string | null;
  contract_pdf_url?: string | null;
  agreed_monthly_rent?: number;
  deposit_amount?: number;
}

interface Tenant {
  id?: number;
  first_name: string;
  last_name: string;
  phone: string;
  id_card_number: string;
  status: string;
}

interface ContractByBookingResponse {
  contract_id: number;
  contract_pdf_url: string | null;
}

// ---------- helpers ----------
const getAiStatusColor = (status: string, confidence: number) => {
  if (status === "pass" && confidence >= 80) return "success";
  if (status === "fail" || status === "error") return "error";
  return "warning";
};

const getIdImageUrl = (raw?: string | null) => {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `http://127.0.0.1:8000${raw}`;
};

const getAbsoluteUrl = (raw?: string | null) => {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `http://127.0.0.1:8000${raw}`;
};

// การ์ดสรุปด้านบน
const DashboardStat = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) => {
  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "0 4px 12px rgba(15,23,42,0.15)",
        p: 1,
        bgcolor: "white",
        transition: "0.25s",
        "&:hover": {
          boxShadow: "0 8px 24px rgba(15,23,42,0.18)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 3,
            bgcolor: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          {icon}
        </Box>

        <Box>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}
          >
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// default contract text (Deposit Contract – DEP)
const buildDefaultContractText = (b: BookingRequest) => {
  const fullName = `${b.first_name} ${b.last_name}`;
  const today = new Date().toLocaleDateString("th-TH");
  const prefix = "DEP"; // Deposit Contract

  return (
    `หนังสือสัญญามัดจำการเช่าห้องพัก (Somkid Apartment)\n` +
    `ประเภทเอกสาร: ${prefix} – Deposit Contract\n` +
    // `เลขที่สัญญาจะถูกกำหนดโดยระบบอัตโนมัติในรูปแบบ [PREFIX]-[YYYY][MM][DD]-[RUNNO]\n\n` +
    `ทำสัญญา ณ วันที่ ${today} โดยมีคู่สัญญาดังนี้\n` +
    `ผู้เช่า: ${fullName} เลขบัตรประชาชน / Passport ${b.id_card_number} เบอร์โทรศัพท์ ${b.phone}\n` +
    `ห้องพักที่เช่า: ห้องหมายเลข ${
      b.room_id
    } ค่าเช่ารายเดือน ${b.agreed_monthly_rent?.toLocaleString?.() || ""} บาท จำนวนเงินมัดจำ ${
      b.deposit_amount?.toLocaleString?.() || ""
    } บาท\n\n` +
    `ข้อ 1 ผู้เช่าตกลงทำสัญญาเช่าห้องพักดังกล่าว โดยชำระเงินมัดจำตามจำนวนที่กำหนด และชำระค่าเช่ารายเดือนตรงตามกำหนดเวลา\n\n` +
    `ข้อ 2 ผู้เช่ายินยอมปฏิบัติตามกฎระเบียบของอาคาร เช่น การงดส่งเสียงดังรบกวน การรักษาความสะอาด และปฏิบัติตามประกาศของผู้ให้เช่าอย่างเคร่งครัด\n\n` +
    `ข้อ 3 ในกรณีที่ผู้เช่าทำความเสียหายต่อทรัพย์สินภายในห้องพักหรือส่วนกลาง ผู้ให้เช่ามีสิทธิ์หักค่าเสียหายจากเงินมัดจำตามความเหมาะสม\n\n` +
    `ข้อ 4 หากผู้เช่าบอกเลิกสัญญาก่อนครบกำหนดโดยไม่มีเหตุสุดวิสัย ผู้ให้เช่าอาจพิจารณาไม่คืนเงินมัดจำบางส่วนหรือทั้งหมด ตามดุลยพินิจของผู้ให้เช่า\n\n` +
    `*** ผู้ดูแลสามารถแก้ไข ปรับปรุง หรือเพิ่มเติมข้อความในสัญญานี้ได้ ก่อนกดอนุมัติให้ระบบสร้างไฟล์และส่งให้ผู้เช่า ***`
  );
};

const AdminDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingTenants, setLoadingTenants] = useState(true);

  const [selectedBooking, setSelectedBooking] =
    useState<BookingRequest | null>(null);
  const [contractText, setContractText] = useState<string>("");
  const [approveLoading, setApproveLoading] = useState(false);

  // ---------- fetch ----------
  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await api.get<BookingRequest[]>("/bookings/");
      const sorted = res.data.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setBookings(sorted);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchTenants = async () => {
    setLoadingTenants(true);
    try {
      const res = await api.get<Tenant[]>("/tenants/");
      setTenants(res.data);
    } catch (err) {
      console.error("Error fetching tenants:", err);
    } finally {
      setLoadingTenants(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchTenants();
  }, []);

  // ---------- actions ----------
  const openApproveDialog = (b: BookingRequest) => {
    setSelectedBooking(b);
    setContractText(buildDefaultContractText(b));
  };

  const handleApprove = async () => {
    if (!selectedBooking) return;

    if (
      !window.confirm(
        "ยืนยันการอนุมัติ? ระบบจะสร้างสัญญามัดจำ PDF (DEP – Deposit Contract) และอัปเกรดผู้ใช้เป็นผู้เช่า"
      )
    ) {
      return;
    }

    try {
      setApproveLoading(true);
      await api.post(`/bookings/${selectedBooking.id}/approve`, {
        contract_text: contractText,
      });

      alert(
        "✅ อนุมัติสำเร็จ! ระบบสร้างสัญญามัดจำ (DEP) และผู้เช่าเรียบร้อย"
      );
      setSelectedBooking(null);
      setContractText("");
      await fetchBookings();
      await fetchTenants();
    } catch (err: any) {
      console.error(err);
      alert(
        "เกิดข้อผิดพลาดในการอนุมัติ: " +
          (err?.response?.data?.detail || "Unknown Error")
      );
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm("ยืนยันการปฏิเสธคำขอจองนี้?")) return;
    try {
      await api.post(`/bookings/${id}/reject`);
      alert("❌ ปฏิเสธคำขอจองเรียบร้อยแล้ว");
      setSelectedBooking(null);
      fetchBookings();
    } catch (err: any) {
      console.error(err);
      alert(
        "เกิดข้อผิดพลาด: " +
          (err?.response?.data?.detail || "Unknown Error")
      );
    }
  };

  const handleOpenContract = async (bookingId: number) => {
    try {
      const res = await api.get<ContractByBookingResponse>(
        `/contracts/by-booking/${bookingId}`
      );
      const pdfUrl = getAbsoluteUrl(res.data.contract_pdf_url);

      if (!pdfUrl) {
        alert("ยังไม่มีไฟล์สัญญามัดจำในระบบสำหรับคำขอนี้");
        return;
      }

      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error("Error opening contract pdf:", err);
      alert(
        "ไม่สามารถเปิดสัญญามัดจำได้: " +
          (err?.response?.data?.detail || "Unknown Error")
      );
    }
  };

  // ---------- render ----------
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const approvedCount = bookings.filter((b) => b.status === "approved").length;
  const currentTenantCount = tenants.length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Header + Clock */}
      <Box
        mb={4}
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        gap={2}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight="bold"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
            color="primary"
          >
            👮‍♂️ Admin Control Center
          </Typography>
          <Typography color="text.secondary">
            จัดการคำขอเช่า ตรวจสัญญา และดูสถานะผู้เช่าแบบเรียลไทม์
          </Typography>
        </Box>

        {/* นาฬิกาดิจิตอล มุมขวาบน */}
        <Box display="flex" flexDirection="column" alignItems="flex-end">
          <DigitalClock />
        </Box>
      </Box>

      {/* Stats cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <DashboardStat
            title="คำขอรออนุมัติ"
            value={pendingCount}
            icon={<ErrorIcon />}
            color="#f97316"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <DashboardStat
            title="อนุมัติแล้วทั้งหมด"
            value={approvedCount}
            icon={<TaskAltIcon />}
            color="#22c55e"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <DashboardStat
            title="จำนวนผู้เช่าปัจจุบัน"
            value={currentTenantCount}
            icon={<GroupIcon />}
            color="#2563eb"
          />
        </Grid>
      </Grid>

      {/* ตารางคำขอเช่า */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          bgcolor: "white",
        }}
      >
        <Box
          p={2.5}
          bgcolor="#f8fafc"
          borderBottom="1px solid #e2e8f0"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6" fontWeight="bold">
            📋 รายการคำขอเช่าล่าสุด
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ทั้งหมด {bookings.length} รายการ
          </Typography>
        </Box>

        {loadingBookings ? (
          <Box p={5} textAlign="center">
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "#f9fafb" }}>
                <TableRow>
                  <TableCell>
                    <strong>วันเวลา</strong>
                  </TableCell>
                  <TableCell>
                    <strong>ผู้จอง / ห้อง</strong>
                  </TableCell>
                  <TableCell>
                    <strong>ผลตรวจ AI</strong>
                  </TableCell>
                  <TableCell>
                    <strong>สถานะ</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>จัดการ</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      {new Date(row.created_at).toLocaleDateString("th-TH")}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(row.created_at).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <PersonIcon
                          sx={{ color: "#64748b" }}
                          fontSize="small"
                        />
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {row.first_name} {row.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ห้อง ID: {row.room_id} • โทร: {row.phone}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Chip
                          label={`AI: ${row.ai_status.toUpperCase()} (${Math.round(
                            row.ai_confidence
                          )}%)`}
                          color={
                            getAiStatusColor(
                              row.ai_status,
                              row.ai_confidence
                            ) as any
                          }
                          size="small"
                          sx={{ mb: 0.5 }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {row.ai_remark || "-"}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={
                          row.status === "pending"
                            ? "รออนุมัติ"
                            : row.status === "approved"
                            ? "อนุมัติแล้ว"
                            : "ถูกปฏิเสธ"
                        }
                        color={
                          row.status === "approved"
                            ? "success"
                            : row.status === "rejected"
                            ? "error"
                            : "default"
                        }
                        variant={
                          row.status === "pending" ? "filled" : "outlined"
                        }
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      {row.status === "pending" ? (
                        <Box
                          display="flex"
                          gap={1}
                          justifyContent="center"
                          flexWrap="wrap"
                        >
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={() => openApproveDialog(row)}
                            sx={{ borderRadius: 999 }}
                          >
                            ตรวจสอบ / แก้ไขสัญญา
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<CancelIcon />}
                            onClick={() => handleReject(row.id)}
                            sx={{ borderRadius: 999 }}
                          >
                            ปฏิเสธ
                          </Button>
                        </Box>
                      ) : row.status === "approved" ? (
                        <Box
                          display="flex"
                          flexDirection="column"
                          alignItems="center"
                          gap={0.5}
                        >
                          {/* <Typography
                            variant="body2"
                            color="success.main"
                            fontWeight="bold"
                          >
                            <ContractIcon
                              fontSize="small"
                              sx={{ verticalAlign: "middle", mr: 0.5 }}
                            />
                            สัญญามัดจำ(DEP)
                          </Typography> */}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DescriptionIcon />}
                            onClick={() => handleOpenContract(row.id)}
                            sx={{ borderRadius: 999 }}
                          >
                            สัญญามัดจำ(DEP)
                          </Button>
                        </Box>
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          ถูกปฏิเสธแล้ว
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        ไม่พบรายการคำขอจอง
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog ตรวจสอบ & แก้ไขสัญญาก่อนอนุมัติ */}
      <Dialog
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>ตรวจสอบและแก้ไขสัญญาก่อนไปยังการอนุมัติ</DialogTitle>
        <DialogContent dividers>
          {selectedBooking && (
            <Stack spacing={2}>
              {/* สรุปข้อมูลผู้จอง */}
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  ผู้จอง / ห้อง
                </Typography>
                <Typography>
                  {selectedBooking.first_name} {selectedBooking.last_name} |
                  ห้อง ID: {selectedBooking.room_id}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  โทร: {selectedBooking.phone} • เลขบัตร:{" "}
                  {selectedBooking.id_card_number}
                </Typography>
              </Box>

              <Divider />

              {/* ผล AI */}
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  ผลตรวจสอบจาก AI
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`AI: ${selectedBooking.ai_status.toUpperCase()} (${Math.round(
                      selectedBooking.ai_confidence
                    )}%)`}
                    color={
                      getAiStatusColor(
                        selectedBooking.ai_status,
                        selectedBooking.ai_confidence
                      ) as any
                    }
                    size="small"
                  />
                </Stack>
                {selectedBooking.ai_remark && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    หมายเหตุ AI: {selectedBooking.ai_remark}
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  * ระบบ AI ใช้ช่วยตรวจสอบเบื้องต้นเท่านั้น
                  ผู้ดูแลควรตรวจสอบความถูกต้องของบัตรก่อนอนุมัติทุกครั้ง
                </Typography>
              </Box>

              {/* รูปบัตร */}
              {(() => {
                const imageUrl = getIdImageUrl(selectedBooking.id_image_url);
                if (!imageUrl) return null;
                return (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      รูปบัตรประชาชน / Passport
                    </Typography>
                    <Box
                      sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid #e2e8f0",
                        maxHeight: 220,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "#000",
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt="ID Card"
                        style={{
                          maxWidth: "100%",
                          maxHeight: 210,
                          objectFit: "contain",
                        }}
                      />
                    </Box>
                  </Box>
                );
              })()}

              {/* กล่องแก้ไขสัญญา */}
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  ข้อความในสัญญามัดจำ (DEP – Deposit Contract)
                  (แก้ไขได้ก่อนอนุมัติ)
                </Typography>
                <TextField
                  multiline
                  minRows={10}
                  fullWidth
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  sx={{
                    "& textarea": {
                      fontFamily: "TH Sarabun New, sans-serif",
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  * ข้อความนี้จะถูกบันทึกลงฐานข้อมูลและใช้สร้างไฟล์ PDF
                  สัญญามัดจำ โดยระบบจะกำหนดเลขที่สัญญาอัตโนมัติในรูปแบบ{" "}
                  [PREFIX]-[YYYY][MM][DD]-[RUNNO] เช่น DEP-20251204-0003
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedBooking(null)}>ยกเลิก</Button>
          {selectedBooking && (
            <Button
              color="success"
              variant="contained"
              onClick={handleApprove}
              disabled={approveLoading}
              startIcon={<CheckIcon />}
            >
              {approveLoading ? "กำลังอนุมัติ..." : "อนุมัติและสร้างสัญญา"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
