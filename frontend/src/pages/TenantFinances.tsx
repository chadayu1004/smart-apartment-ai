// src/pages/TenantFinances.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Stack,
} from "@mui/material";
import api from "../services/api";

type PaymentStatus = "pending" | "approved" | "rejected" | string;

interface AdminPayment {
  payment_id: number;
  tenant_name: string;
  payer_name: string;
  amount_paid: number;
  payment_status: PaymentStatus;
  created_at: string;
  contract_id: number;
  room_no?: number | null;
  slip_image_url?: string | null;
}

// ✅ helper ต่อ URL ให้ครบก่อนเปิดสลิป
const API_BASE_URL = api.defaults.baseURL || "http://localhost:8000";

const buildSlipUrl = (path?: string | null): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  // ตัด / นำหน้าออก แล้วต่อกับ baseURL
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
};

const TenantFinances: React.FC = () => {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const response = await api.get<AdminPayment[]>("/payments/admin");
      setPayments(response.data);
    } catch (error) {
      console.error("Error fetching tenant finances", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const getStatusLabel = (status: PaymentStatus) => {
    if (status === "approved") return "อนุมัติแล้ว";
    if (status === "rejected") return "ถูกปฏิเสธ";
    if (status === "pending" || status === "pending_review") return "รอตรวจสอบ";
    return status;
  };

  const getStatusColor = (
    status: PaymentStatus
  ): "default" | "success" | "error" | "warning" => {
    if (status === "approved") return "success";
    if (status === "rejected") return "error";
    return "warning"; // pending / อื่น ๆ
  };

  const formatDateTime = (value: string) => {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  };

  const handleApprove = async (paymentId: number) => {
    try {
      setApprovingId(paymentId);

      // ✅ backend เปลี่ยนเป็น POST /payments/{id}/approve แล้ว
      const res = await api.post<AdminPayment>(
        `/payments/${paymentId}/approve`
      );

      const updated = res.data;
      setPayments((prev) =>
        prev.map((p) => (p.payment_id === paymentId ? updated : p))
      );
    } catch (error) {
      console.error("Error approving payment", error);
      alert("ไม่สามารถอนุมัติรายการนี้ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        การชำระเงินของผู้เช่า
      </Typography>

      {loading ? (
        <Box textAlign="center" py={4}>
          <CircularProgress />
          <Typography mt={2}>กำลังโหลดข้อมูลการชำระเงิน...</Typography>
        </Box>
      ) : payments.length === 0 ? (
        <Typography color="text.secondary">
          ยังไม่มีรายการชำระเงินจากผู้เช่า
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 900 }} aria-label="tenant finances table">
            <TableHead>
              <TableRow>
                <TableCell>ชื่อผู้เช่า</TableCell>
                <TableCell>ผู้โอน</TableCell>
                <TableCell>ห้อง</TableCell>
                <TableCell>วันที่ทำรายการ</TableCell>
                <TableCell align="right">จำนวนเงิน</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="center">การจัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.payment_id} hover>
                  <TableCell>{p.tenant_name}</TableCell>
                  <TableCell>{p.payer_name}</TableCell>
                  <TableCell>
                    {p.room_no ? `ห้อง ${p.room_no}` : "-"}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      สัญญา #{p.contract_id}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDateTime(p.created_at)}</TableCell>
                  <TableCell align="right">
                    {p.amount_paid.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    บาท
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(p.payment_status)}
                      color={getStatusColor(p.payment_status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="center"
                      alignItems="center"
                    >
                      {p.slip_image_url && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const url = buildSlipUrl(p.slip_image_url);
                            if (!url) {
                              alert("ไม่พบลิงก์สลิป");
                              return;
                            }
                            window.open(url, "_blank");
                          }}
                        >
                          ดูสลิป
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        disabled={
                          p.payment_status === "approved" ||
                          approvingId === p.payment_id
                        }
                        onClick={() => handleApprove(p.payment_id)}
                      >
                        {p.payment_status === "approved"
                          ? "อนุมัติแล้ว"
                          : approvingId === p.payment_id
                          ? "กำลังอนุมัติ..."
                          : "อนุมัติ"}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default TenantFinances;
