// src/components/AdminPaymentList.tsx

import React, { useState, useEffect } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Stack,
} from "@mui/material";
import api from "../services/api";

interface AdminPaymentItem {
  payment_id: number;
  tenant_name?: string;
  payer_name: string;
  amount_paid: number;
  payment_status: string;
  created_at: string;
  contract_id: number;
  room_no?: number | null;
}

const statusColor = (status: string):
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info" => {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "error";
    case "pending":
      return "warning";
    default:
      return "default";
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "approved":
      return "อนุมัติแล้ว";
    case "rejected":
      return "ปฏิเสธแล้ว";
    case "pending":
      return "รอตรวจสอบ";
    default:
      return status;
  }
};

const AdminPaymentList: React.FC = () => {
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ ใช้ endpoint สำหรับ admin โดยเฉพาะ
      const res = await api.get<AdminPaymentItem[]>("/payments/admin");
      setPayments(res.data);
    } catch (err) {
      console.error("Error fetching payments", err);
      setError("ไม่สามารถโหลดข้อมูลการชำระเงินได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleUpdateStatus = async (
    paymentId: number,
    action: "approve" | "reject"
  ) => {
    try {
      setUpdatingId(paymentId);
      setError(null);

      await api.post(`/payments/${paymentId}/${action}`);

      // โหลดข้อมูลใหม่หลังอัปเดตสำเร็จ
      await fetchPayments();
    } catch (err) {
      console.error(`Error ${action} payment`, err);
      setError("ไม่สามารถอัปเดตสถานะการชำระเงินได้");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          การชำระเงินของผู้เช่า
        </Typography>
        <Button variant="outlined" size="small" onClick={fetchPayments}>
          รีเฟรช
        </Button>
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {!loading && !error && payments.length === 0 && (
        <Typography color="text.secondary">
          ยังไม่มีรายการการชำระเงิน
        </Typography>
      )}

      {!loading && !error && payments.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>รหัส</TableCell>
              <TableCell>ชื่อผู้เช่า</TableCell>
              <TableCell>ชื่อผู้โอน</TableCell>
              <TableCell>จำนวนเงิน</TableCell>
              <TableCell>วันที่ทำรายการ</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">การจัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.payment_id} hover>
                <TableCell>{payment.payment_id}</TableCell>
                <TableCell>{payment.tenant_name || "-"}</TableCell>
                <TableCell>{payment.payer_name}</TableCell>
                <TableCell>
                  {payment.amount_paid.toLocaleString()} บาท
                </TableCell>
                <TableCell>
                  {new Date(payment.created_at).toLocaleString("th-TH")}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={statusColor(payment.payment_status)}
                    label={statusLabel(payment.payment_status)}
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {/* ปุ่มดูรายละเอียด – ตอนนี้ให้ alert ไปก่อน */}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        alert(
                          `ดูรายละเอียดการชำระเงิน #${payment.payment_id}`
                        )
                      }
                    >
                      ดูรายละเอียด
                    </Button>

                    {payment.payment_status === "pending" && (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={updatingId === payment.payment_id}
                          onClick={() =>
                            handleUpdateStatus(payment.payment_id, "approve")
                          }
                        >
                          อนุมัติ
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          disabled={updatingId === payment.payment_id}
                          onClick={() =>
                            handleUpdateStatus(payment.payment_id, "reject")
                          }
                        >
                          ปฏิเสธ
                        </Button>
                      </>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export default AdminPaymentList;
