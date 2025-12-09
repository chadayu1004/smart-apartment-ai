// src/pages/MyRoom.tsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  BedroomParent as MyRoomIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import api from "../services/api";
import DigitalClock from "../components/DigitalClock";

interface MyRoomInfo {
  room_id: number;
  building?: string | null;
  floor?: number | null;
  status?: string | null;
}

interface MyContract {
  contract_id: number;
  room_id: number;
  deposit_status: string;
  deposit_amount: number;
  contract_pdf_url?: string | null;
}

// ฟังก์ชันแก้ URL ให้ชี้ไปที่ backend จริง ๆ
const getAbsoluteUrl = (raw?: string | null) => {
  if (!raw) return null;
  // ถ้า backend ส่งมาเป็น full URL อยู่แล้วก็ใช้เลย
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  // ถ้าเป็น path เช่น /media/contracts/contract_19.pdf
  // ให้ต่อกับ host ของ backend
  return `http://127.0.0.1:8000${raw}`;
};

const MyRoom: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<MyRoomInfo | null>(null);
  const [contract, setContract] = useState<MyContract | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setRoom(null);
    setContract(null);

    // 1) ดึงข้อมูลห้อง /my-room
    try {
      const res = await api.get<MyRoomInfo>("/my-room");
      setRoom(res.data);
    } catch (err: any) {
      console.error("Error fetching my-room:", err);
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Not Found"
      );
    }

    // 2) ดึงข้อมูลสัญญาล่าสุด /contracts/me/latest
    try {
      const res = await api.get<MyContract>("/contracts/me/latest");
      setContract(res.data);
    } catch (err: any) {
      console.error("Error fetching contract /contracts/me/latest:", err);
      // ถ้า 404 ก็เฉย ๆ แค่ไม่มีสัญญา
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ฟังก์ชันเปิดสัญญา PDF
  const handleOpenContract = () => {
    if (!contract) {
      alert("ยังไม่มีข้อมูลสัญญาเช่า");
      return;
    }
    const pdfUrl = getAbsoluteUrl(contract.contract_pdf_url);
    if (!pdfUrl) {
      alert("ยังไม่มีไฟล์สัญญาในระบบ");
      return;
    }
    // เปิดแท็บใหม่ไปที่ไฟล์ PDF
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      {/* Header + นาฬิกามุมขวาบน */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <MyRoomIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              ห้องของฉัน
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ดูรายละเอียดห้องพักและสรุปสถานะสัญญาเช่าของคุณ
            </Typography>
          </Box>
        </Box>

        <DigitalClock />
      </Box>

      {loading ? (
        <Box textAlign="center" py={5}>
          <CircularProgress />
        </Box>
      ) : !room ? (
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              color="error"
              gutterBottom
              fontWeight="bold"
            >
              Not Found
            </Typography>
            <Typography color="text.secondary" mb={2}>
              ระบบยังไม่พบข้อมูลห้องพักที่ผูกกับบัญชีผู้ใช้ของคุณ
              หากคุณเพิ่งทำสัญญาเช่า กรุณาลองโหลดใหม่อีกครั้ง
              หรือสอบถามผู้ดูแลอาคาร
            </Typography>
            {error && (
              <Typography color="error" mb={1}>
                {error}
              </Typography>
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
            >
              ลองใหม่อีกครั้ง
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            {/* ข้อมูลห้อง */}
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              ข้อมูลห้องพักของคุณ
            </Typography>
            <Typography>
              หมายเลขห้อง: <strong>{room.room_id}</strong>
            </Typography>
            {room.building && (
              <Typography>อาคาร: {room.building}</Typography>
            )}
            {room.floor != null && <Typography>ชั้น: {room.floor}</Typography>}
            {room.status && <Typography>สถานะห้อง: {room.status}</Typography>}

            {/* ข้อมูลสัญญา / มัดจำ (ถ้ามี) */}
            {contract && (
              <Box mt={3}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  ข้อมูลสัญญา &amp; มัดจำ
                </Typography>
                <Typography variant="body2" gutterBottom>
                  เลขที่สัญญา: <strong>{contract.contract_id}</strong>
                </Typography>
                <Typography variant="body2" gutterBottom>
                  สถานะมัดจำ:{" "}
                  <strong>
                    {contract.deposit_status === "paid"
                      ? "ชำระแล้ว"
                      : "ยังไม่ชำระครบ"}
                  </strong>
                </Typography>
                <Typography variant="body2" gutterBottom>
                  เงินมัดจำที่ต้องชำระ:{" "}
                  <strong>{contract.deposit_amount.toLocaleString()} บาท</strong>
                </Typography>

                {/* ปุ่มดูสัญญา PDF */}
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    startIcon={<DescriptionIcon />}
                    onClick={handleOpenContract}
                  >
                    ดูสัญญาเช่า (PDF)
                  </Button>
                </Box>
              </Box>
            )}

            <Box mt={3}>
              <Typography variant="body2" color="text.secondary">
                * หน้านี้แสดงข้อมูลห้องพักและสรุปสถานะสัญญาเช่าของคุณ
                หากต้องการแนบหลักฐานการชำระเงินมัดจำ
                หรือจัดการการชำระเงินเพิ่มเติม
                กรุณาไปที่เมนู{" "}
                <strong>“การชำระเงิน &amp; มัดจำ”</strong> ทางด้านซ้าย
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default MyRoom;
