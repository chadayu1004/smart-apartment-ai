// src/pages/AdminRooms.tsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Grid,
  Box,
  Button,
  Divider,
  Card,
  CardContent,
  CardMedia,
  Skeleton,
} from "@mui/material";

import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  AcUnit,
  Wifi as WifiIcon,
  Chair,
  LocalParking,
  Shower,
} from "@mui/icons-material";

import api from "../services/api";
import AddRoomModal from "../components/AddRoomModal";

// ============================
// ICONS
// ============================
const amenityIcons: Record<string, JSX.Element> = {
  air: <AcUnit fontSize="small" />,
  wifi: <WifiIcon fontSize="small" />,
  furniture: <Chair fontSize="small" />,
  parking: <LocalParking fontSize="small" />,
  heater: <Shower fontSize="small" />,
};

// ============================
// MAP ภาษาไทย → KEY ของ ICON
// ============================
const amenityKeyMap: Record<string, string> = {
  "แอร์": "air",
  "air": "air",

  "เฟอร์นิเจอร์": "furniture",
  "furniture": "furniture",

  "ที่จอดรถ": "parking",
  "parking": "parking",

  "Wifi": "wifi",
  "wifi": "wifi",

  "เครื่องทำน้ำอุ่น": "heater",
  "heater": "heater",
};

interface Room {
  id: number;
  room_number: string;
  building: string;
  floor: number;
  room_type: string;
  price: number;
  image_url: string | null;
  status: string;
  promotion?: string | null;
  amenities?: string[];
}

const getRoomImage = (image_url?: string | null) => {
  if (!image_url) return "/placeholder-room.jpg";
  if (image_url.startsWith("http")) return image_url;
  return `http://127.0.0.1:8000${image_url}`;
};

const AdminRooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [openRoomModal, setOpenRoomModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const resRooms = await api.get<Room[]>("/rooms/");
      setRooms(resRooms.data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleDeleteRoom = async (id: number) => {
    if (!confirm("ต้องการลบห้องนี้ใช่หรือไม่?")) return;
    try {
      await api.delete(`/rooms/${id}`);
      fetchRooms();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 5, pb: 5 }}>
      
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            🛏️ จัดการห้องพัก
          </Typography>
          <Typography variant="body1" color="text.secondary">
            เพิ่ม / ลบ / จัดการข้อมูลห้องพักในระบบ
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRooms}>
            รีโหลดข้อมูล
          </Button>

          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => setOpenRoomModal(true)}>
            เพิ่มห้องพัก
          </Button>
        </Box>
      </Box>

      {/* <Divider sx={{ mb: 4, borderBottomWidth: 3 }} /> */}

      {/* GRID */}
      <Grid container spacing={4}>
        {loading
          ? // ============== SKELETON ===============
            [1, 2, 3, 4].map((i) => (
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
                    <Skeleton width="70%" height={26} />
                    <Skeleton width="60%" height={22} sx={{ mt: 1 }} />
                    <Skeleton width="50%" height={26} sx={{ mt: 1 }} />
                    <Skeleton variant="rounded" width="100%" height={36} sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))
          : 
          // ============== ROOMS CARD ===============
          rooms.map((room) => (
            <Grid item key={room.id}>
              <Card
                sx={{
                  width: 320,
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  borderRadius: 3,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                }}
              >
                {/* รูปห้อง + Zoom Effect */}
                <Box sx={{ position: "relative", overflow: "hidden" }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={getRoomImage(room.image_url)}
                    sx={{
                      objectFit: "cover",
                      transition: "transform 0.35s ease",
                      "&:hover": {
                        transform: "scale(1.07)",
                      },
                    }}
                  />

                  {/* ป้ายโปรโมชั่น */}
                  {room.promotion && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        bgcolor: "error.main",
                        color: "white",
                        px: 1.3,
                        py: 0.4,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        borderRadius: 2,
                      }}
                    >
                      {room.promotion}
                    </Box>
                  )}
                </Box>

                {/* เนื้อหา */}
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Typography variant="h6" color="primary" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {room.price.toLocaleString()} ฿ / เดือน
                  </Typography>

                  <Typography variant="subtitle1" fontWeight={700}>
                    ห้อง {room.room_number} ({room.room_type})
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    ตึก {room.building} • ชั้น {room.floor}
                  </Typography>

                  {/* Amenities */}
                  {room.amenities && room.amenities.length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                      {room.amenities.map((a) => {
                        const key = amenityKeyMap[a] ?? a;

                        return (
                          <Box
                            key={a}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.6,
                              px: 1.1,
                              py: 0.25,
                              bgcolor: "#e8f0fe",
                              color: "#1a73e8",
                              borderRadius: 999,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            {amenityIcons[key] ?? null}
                            {a}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </CardContent>

                {/* ปุ่มลบ */}
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeleteRoom(room.id)}
                >
                  ลบห้อง
                </Button>
              </Card>
            </Grid>
          ))}
      </Grid>

      {/* Modal Add Room */}
      <AddRoomModal
        open={openRoomModal}
        onClose={() => setOpenRoomModal(false)}
        onSuccess={fetchRooms}
      />
    </Container>
  );
};

export default AdminRooms;
