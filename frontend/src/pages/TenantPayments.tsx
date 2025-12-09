// src/pages/TenantPayments.tsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Chip,
  Button,
  CircularProgress,
  Stack,
  Alert,
  Grid,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Description as DescriptionIcon,
  Payments as PaymentsIcon,
} from "@mui/icons-material";
import api from "../services/api";
import PaymentForm from "../components/PaymentForm";

// ✅ เพิ่มสถานะ pending_review
type DepositStatus = "pending" | "pending_review" | "paid" | "overdue";

interface MyContract {
  contract_id: number;
  room_id: number;
  deposit_status: DepositStatus;
  deposit_amount: number;
  deposit_due_date?: string | null;
  contract_pdf_url?: string | null;
  deposit_slip_url?: string | null;
}

const getStatusChipColor = (status: DepositStatus) => {
  if (status === "paid") return "success";
  if (status === "overdue") return "error";
  if (status === "pending_review") return "info";
  return "warning";
};

const getStatusLabel = (status: DepositStatus) => {
  switch (status) {
    case "paid":
      return "ชำระมัดจำแล้ว";
    case "overdue":
      return "เกินกำหนดชำระมัดจำ";
    case "pending_review":
      return "รอตรวจสอบการชำระเงิน";
    case "pending":
    default:
      return "รอชำระมัดจำ";
  }
};

// ✅ base URL ของ backend ดึงจาก axios ถ้ามี กำหนด default เผื่อไว้
const API_BASE_URL: string =
  (api.defaults?.baseURL as string) || "http://127.0.0.1:8000";

// ✅ helper ทำให้ path เป็น URL เต็มแน่นอน
const buildBackendUrl = (raw?: string | null): string | null => {
  if (!raw) return null;

  let path = raw.trim();
  if (path === "") return null;

  // ถ้าเป็น full URL แล้วก็ใช้เลย
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // ให้แน่ใจว่ามี / นำหน้า เช่น media/... -> /media/...
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  // ตัด / ท้าย baseURL กันเป็น //media
  const base = API_BASE_URL.replace(/\/+$/, "");
  return `${base}${path}`;
};

const TenantPayments: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<MyContract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const fetchContract = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<MyContract>("/contracts/me/latest");
      setContract(res.data);
    } catch (err: any) {
      console.error("Error fetching contract:", err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "ไม่สามารถโหลดข้อมูลการมัดจำได้";
      setError(msg);
      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, []);

  // ✅ ฟังก์ชันเปิดสัญญา PDF
  const handleOpenContract = () => {
    if (!contract) return;

    // ถ้ามี path ใน DB ใช้อันนั้นก่อน
    const rawPath =
      contract.contract_pdf_url ||
      `/media/contracts/contract_${contract.contract_id}.pdf`;

    const pdfUrl = buildBackendUrl(rawPath);

    console.log("Opening contract PDF:", pdfUrl);

    if (!pdfUrl) {
      alert("ยังไม่มีไฟล์สัญญาในระบบ");
      return;
    }

    // ใช้ <a> แทน window.open เพื่อเลี่ยง about:blank#blocked
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // helper สำหรับลิงก์สลิป
  const getSlipUrl = (raw?: string | null) => buildBackendUrl(raw || "");

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <PaymentsIcon color="primary" />
        <Typography variant="h5" fontWeight="bold">
          การชำระเงิน &amp; มัดจำ
        </Typography>
      </Box>

      {loading ? (
        <Box textAlign="center" py={5}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Card>
          <CardContent>
            <Typography color="error" mb={1}>
              {error}
            </Typography>
            <Button variant="outlined" onClick={fetchContract}>
              ลองใหม่อีกครั้ง
            </Button>
          </CardContent>
        </Card>
      ) : !contract ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">
              ขณะนี้ไม่มีข้อมูลสัญญามัดจำในระบบสำหรับบัญชีนี้
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={8}>
                <Typography variant="h6" gutterBottom>
                  สัญญาเช่าห้องพักเลขที่ {contract.contract_id}
                </Typography>
                <Typography color="text.secondary">
                  ห้องพักหมายเลข: {contract.room_id}
                </Typography>
                <Typography color="text.secondary">
                  จำนวนเงินมัดจำ: {contract.deposit_amount.toLocaleString()} บาท
                </Typography>
                {contract.deposit_due_date && (
                  <Typography color="text.secondary">
                    กำหนดชำระภายในวันที่{" "}
                    {new Date(contract.deposit_due_date).toLocaleDateString(
                      "th-TH"
                    )}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box display="flex" justifyContent="flex-end">
                  <Chip
                    label={getStatusLabel(contract.deposit_status)}
                    color={getStatusChipColor(contract.deposit_status) as any}
                    icon={
                      contract.deposit_status === "paid" ? (
                        <CheckCircleIcon />
                      ) : contract.deposit_status === "overdue" ? (
                        <ErrorIcon />
                      ) : undefined
                    }
                    sx={{ fontWeight: "bold" }}
                  />
                </Box>
              </Grid>
            </Grid>

            <Box mt={2}>
              {/* ---------- ข้อความแจ้งเตือนตามสถานะ ---------- */}
              {contract.deposit_status === "pending" && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  ยังไม่พบการชำระมัดจำ กรุณาชำระค่ามัดจำตามจำนวนที่กำหนด
                  และแนบหลักฐานการโอนเงิน
                </Alert>
              )}

              {contract.deposit_status === "pending_review" && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  ระบบได้รับหลักฐานการชำระเงินของคุณแล้ว
                  ขณะนี้กำลังรอผู้ดูแลตรวจสอบและอนุมัติ
                </Alert>
              )}

              {contract.deposit_status === "overdue" && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  ค่ามัดจำของคุณเกินกำหนดชำระแล้ว
                  กรุณาติดต่อผู้ดูแลอาคารโดยด่วน
                </Alert>
              )}

              {contract.deposit_status === "paid" && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  ระบบบันทึกว่าคุณชำระค่ามัดจำแล้ว ขอบคุณค่ะ
                </Alert>
              )}

              {/* ---------- ปุ่มแนบหลักฐาน (เฉพาะยังไม่ส่งสลิป) ---------- */}
              {(contract.deposit_status === "pending" ||
                contract.deposit_status === "overdue") && (
                <Box mb={2} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    sx={{ marginLeft: "auto" }}
                    onClick={() => setShowPaymentForm((prev) => !prev)}
                  >
                    {showPaymentForm
                      ? "ซ่อนฟอร์มแนบหลักฐานการชำระเงิน"
                      : "แนบหลักฐานการชำระเงิน"}
                  </Button>
                </Box>
              )}

              {/* ลิงก์เปิดสลิปล่าสุด (ถ้ามี) */}
              {contract.deposit_slip_url && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  หลักฐานล่าสุด:{" "}
                  <a
                    href={getSlipUrl(contract.deposit_slip_url) || "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    เปิดดูหลักฐาน
                  </a>
                </Typography>
              )}

              {/* ปุ่มดูสัญญา + รีเฟรช */}
              <Stack direction="row" spacing={2} mt={2}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DescriptionIcon />}
                  onClick={handleOpenContract}
                  sx={{ borderRadius: 999 }}
                >
                  ดูสัญญา
                </Button>

                <Button variant="outlined" onClick={fetchContract}>
                  รีเฟรชสถานะ
                </Button>
              </Stack>

              {/* ---------- ฟอร์มแนบสลิป ---------- */}
              {showPaymentForm &&
                (contract.deposit_status === "pending" ||
                  contract.deposit_status === "overdue") && (
                  <Box mt={3}>
                    <PaymentForm
                      contractId={contract.contract_id}
                      depositAmount={contract.deposit_amount}
                      onSuccess={fetchContract}
                    />
                  </Box>
                )}
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default TenantPayments;
