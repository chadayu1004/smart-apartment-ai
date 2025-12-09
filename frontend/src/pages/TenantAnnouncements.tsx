// src/pages/TenantAnnouncements.tsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Stack,
  Chip,
  CircularProgress,
} from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import api from "../services/api";

// type ของประกาศ (ให้ตรงกับ backend)
interface Announcement {
  id?: number;
  title: string;
  content: string;
  created_at?: string;
}

type RangeFilter = "all" | "7d" | "30d";

const TenantAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [range, setRange] = useState<RangeFilter>("all");

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Announcement[]>("/announcements/");
      // เรียงใหม่ -> เก่า
      const sorted = [...res.data].sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      });
      setAnnouncements(sorted);
    } catch (err: any) {
      console.error("Error fetch announcements:", err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "ไม่สามารถโหลดข่าวสารได้"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // format วันที่
  const formatDateTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // filter ตามช่วงเวลา
  const inRange = (a: Announcement) => {
    if (range === "all" || !a.created_at) return true;
    const created = new Date(a.created_at).getTime();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (range === "7d") {
      return created >= now - 7 * dayMs;
    }
    if (range === "30d") {
      return created >= now - 30 * dayMs;
    }
    return true;
  };

  // filter ตามคำค้น
  const matchSearch = (a: Announcement) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q)
    );
  };

  const filteredAnnouncements = announcements.filter(
    (a) => inRange(a) && matchSearch(a)
  );

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 5 }}>
      {/* หัวข้อหน้า */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 3,
        }}
      >
        <CampaignIcon color="primary" />
        <Typography variant="h5" fontWeight="bold">
          ข่าวสาร / ประกาศสำหรับผู้เช่า
        </Typography>
      </Box>

      {/* กล่องฟิลเตอร์ */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: "0 6px 16px rgba(15,23,42,0.12)",
        }}
      >
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            ตัวกรองข่าวสาร
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            {/* ค้นหาจากหัวข้อ/เนื้อหา */}
            <TextField
              label="ค้นหาข่าว (หัวข้อหรือเนื้อหา)"
              size="small"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* ช่วงเวลา */}
            <Stack direction="row" spacing={1}>
              <Chip
                label="ทั้งหมด"
                size="small"
                clickable
                color={range === "all" ? "primary" : "default"}
                onClick={() => setRange("all")}
              />
              <Chip
                label="7 วันล่าสุด"
                size="small"
                clickable
                color={range === "7d" ? "primary" : "default"}
                onClick={() => setRange("7d")}
              />
              <Chip
                label="30 วันล่าสุด"
                size="small"
                clickable
                color={range === "30d" ? "primary" : "default"}
                onClick={() => setRange("30d")}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* เนื้อหาข่าว */}
      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
          <Typography mt={2}>กำลังโหลดข่าวสาร...</Typography>
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : filteredAnnouncements.length === 0 ? (
        <Typography color="text.secondary">
          ไม่พบข่าวสารตามเงื่อนไขที่เลือก
        </Typography>
      ) : (
        <Stack spacing={2}>
          {filteredAnnouncements.map((item) => (
            <Card
              key={item.id}
              sx={{
                borderRadius: 2,
                boxShadow: "0 3px 10px rgba(15,23,42,0.10)",
              }}
            >
              <CardContent>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  sx={{ mb: 0.5 }}
                >
                  {item.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-line" }}
                  color="text.secondary"
                >
                  {item.content}
                </Typography>
                {item.created_at && (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ mt: 0.75, display: "block" }}
                  >
                    อัปเดตล่าสุด: {formatDateTime(item.created_at)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
};
export default TenantAnnouncements;
