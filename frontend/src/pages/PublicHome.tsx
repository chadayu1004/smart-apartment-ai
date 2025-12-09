// src/pages/PublicHome.tsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Paper,
  FormControlLabel,
  Checkbox,
  Skeleton,
  Button,
} from "@mui/material";
import api from "../services/api";
import RoomCard from "../components/RoomCard";
import BookingModal from "../components/BookingModal";
import { useAuth } from "../context/AuthContext";

// ====== types ======
interface Room {
  id: number;
  room_number: string;
  building: string;
  floor: number;
  room_type: string;
  price: number;
  status: string;
  image_url?: string | null;
  promotion?: string | null;
  amenities?: string[];
  description?: string | null;
}

interface Announcement {
  id?: number;
  title: string;
  content: string;
  created_at?: string;
}

const AMENITY_OPTIONS = [
  "แอร์",
  "เฟอร์นิเจอร์",
  "ที่จอดรถ",
  "Wifi",
  "เครื่องทำน้ำอุ่น",
];

const PublicHome: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // ข่าวสาร / ประกาศ
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false); // toggle

  const { user, isAuthenticated } = useAuth();

  // ====== fetch rooms ======
  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Room[]>("/rooms/");
      setRooms(res.data);
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถโหลดข้อมูลห้องพักได้");
    } finally {
      setLoading(false);
    }
  };

  // ====== fetch announcements ======
  const fetchAnnouncements = async () => {
    try {
      const res = await api.get<Announcement[]>("/announcements/");
      // เรียงใหม่->เก่า เผื่อ backend ไม่ sort
      const sorted = [...res.data].sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      });
      setAnnouncements(sorted);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchAnnouncements();
  }, []);

  const toggleAmenity = (am: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(am) ? prev.filter((x) => x !== am) : [...prev, am]
    );
  };

  const filteredRooms = rooms
    .filter((room) => room.status === "available")
    .filter((room) =>
      selectedAmenities.length === 0
        ? true
        : selectedAmenities.every((am) => room.amenities?.includes(am))
    );

  // helper แปลงวันที่ประกาศ
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

  // ✅ ข่าวที่จะแสดง (1 ข่าวล่าสุด หรือทั้งหมด)
  const announcementsToShow = showAllAnnouncements
    ? announcements
    : announcements.slice(0, 1);

  // ✅ กดจองห้อง
  const handleBookRoom = (room: Room) => {
    if (!isAuthenticated || !user) {
      alert(
        "กรุณาเข้าสู่ระบบก่อนทำการจองห้องพัก\nหากยังไม่มีบัญชี กรุณาสมัครสมาชิกก่อน"
      );
      return;
    }
    setSelectedRoom(room);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 8, pb: 6 }}>
      {/* ====== กล่องข่าวสาร / ประกาศ ====== */}
      {announcements.length > 0 && (
        <Card
          sx={{
            mb: 4,
            borderRadius: 3,
            boxShadow: "0 8px 20px rgba(15,23,42,0.12)",
            bgcolor: "#f9fafb",
          }}
        >
          <CardContent>
            {/* หัวข้อด้านบน (ไม่มีปุ่มแล้ว) */}
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}
            >
              📢 ข่าวสาร / ประกาศจาก Somkid Apartment
            </Typography>

            {/* เนื้อหาข่าว */}
            {announcementsToShow.map((item) => (
              <Box key={item.id} sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight="bold">
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
                    sx={{ mt: 0.25, display: "block" }}
                  >
                    อัปเดตล่าสุด: {formatDateTime(item.created_at)}
                  </Typography>
                )}
              </Box>
            ))}

            {/* ข้อความบอกว่าเป็นข่าวล่าสุด 1 ข่าว (ตอนยังไม่ขยาย) */}
            {!showAllAnnouncements && announcements.length > 1 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                แสดงเฉพาะข่าวล่าสุด 1 ข่าว หากต้องการดูข่าวเก่าทั้งหมดให้กด
                “ดูข่าวสารย้อนหลัง”
              </Typography>
            )}

            {/* ✅ ปุ่มมุมขวาล่างของกล่องข่าว */}
            {announcements.length > 1 && (
              <Box
                sx={{
                  mt: 1.5,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setShowAllAnnouncements((prev) => !prev)
                  }
                >
                  {showAllAnnouncements
                    ? "ย่อเหลือข่าวล่าสุด"
                    : "ดูข่าวสารย้อนหลัง"}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* ฟิลเตอร์สิ่งอำนวยความสะดวก */}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
          🔍 ค้นหาห้องที่ใช่ สำหรับคุณ
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          เลือกสิ่งอำนวยความสะดวกที่คุณต้องการ:
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {AMENITY_OPTIONS.map((am) => (
            <FormControlLabel
              key={am}
              control={
                <Checkbox
                  checked={selectedAmenities.includes(am)}
                  onChange={() => toggleAmenity(am)}
                  disabled={loading}
                />
              }
              label={am}
            />
          ))}
        </Box>
      </Paper>

      {/* แสดง error */}
      {error && (
        <Typography color="error" align="center" sx={{ mb: 3 }}>
          {error}
        </Typography>
      )}

      {/* Loading: Skeleton */}
      {loading ? (
        <Grid container spacing={4}>
          {[1, 2, 3].map((i) => (
            <Grid item key={i}>
              <Card
                sx={{
                  width: 320,
                  borderRadius: 3,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton width="60%" height={28} />
                  <Skeleton width="80%" height={24} />
                  <Skeleton width="50%" height={24} sx={{ mt: 1 }} />
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Skeleton variant="rounded" width={60} height={26} />
                    <Skeleton variant="rounded" width={60} height={26} />
                  </Box>
                  <Skeleton
                    variant="rounded"
                    width="100%"
                    height={40}
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filteredRooms.length === 0 ? (
        <Typography align="center" color="text.secondary">
          ไม่พบห้องตามเงื่อนไขที่เลือก
        </Typography>
      ) : (
        <Grid container spacing={4}>
          {filteredRooms.map((room) => (
            <Grid item key={room.id}>
              <RoomCard room={room} onBook={handleBookRoom} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* โมดัลจองห้อง (เฉพาะตอนล็อกอินแล้ว) */}
      {selectedRoom && isAuthenticated && (
        <BookingModal
          open={!!selectedRoom}
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </Container>
  );
};

export default PublicHome;
