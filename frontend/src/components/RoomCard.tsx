// src/components/RoomCard.tsx
import React from "react";
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Button,
  Box,
} from "@mui/material";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import WifiIcon from "@mui/icons-material/Wifi";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import HotTubIcon from "@mui/icons-material/HotTub";

export interface Room {
  id: number;
  room_number: string;
  building: string;
  floor: number;
  room_type: string;
  price: number;
  amenities?: string[];
  promotion?: string | null;
  image_url?: string | null;
}

interface RoomCardProps {
  room: Room;
  onBook: (room: Room) => void; // <<< ใช้งานจริงแล้ว
}

const iconMap: Record<string, JSX.Element> = {
  แอร์: <AcUnitIcon fontSize="small" />,
  เฟอร์นิเจอร์: <MeetingRoomIcon fontSize="small" />,
  ที่จอดรถ: <DirectionsCarIcon fontSize="small" />,
  Wifi: <WifiIcon fontSize="small" />,
  เครื่องทำน้ำอุ่น: <HotTubIcon fontSize="small" />,
};

const getRoomImage = (image_url?: string | null) => {
  if (!image_url) return "/placeholder-room.jpg";
  if (image_url.startsWith("http")) return image_url;
  return `http://127.0.0.1:8000${image_url}`;
};

// ✅ ตรงนี้เปลี่ยนมาใช้ RoomCardProps
const RoomCard: React.FC<RoomCardProps> = ({ room, onBook }) => {
  const amenities = room.amenities ?? [];

  return (
    <Card
      sx={{
        width: 320, // กล่องเล็กลง
        borderRadius: 3,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        overflow: "hidden",
        mb: 4,
      }}
    >
      {/* รูป + hover zoom */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        <CardMedia
          component="img"
          height="200"
          image={getRoomImage(room.image_url)}
          alt={room.room_number}
          sx={{
            objectFit: "cover",
            transition: "transform 0.4s ease",
            "&:hover": {
              transform: "scale(1.06)", // zoom ตอน hover
            },
          }}
        />

        {/* ป้ายโปรโมชั่น */}
        {room.promotion && (
          <Chip
            label={room.promotion}
            color="error"
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              fontWeight: "bold",
            }}
          />
        )}
      </Box>

      <CardContent sx={{ p: 2 }}>
        {/* ราคา */}
        <Typography
          variant="h6"
          sx={{ color: "#1976d2", fontWeight: "bold", mb: 0.5 }}
        >
          {room.price.toLocaleString()} ฿ / เดือน
        </Typography>

        {/* ชื่อห้อง + type */}
        <Typography variant="subtitle1" fontWeight="bold">
          ห้อง {room.room_number} ({room.room_type})
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ตึก {room.building} • ชั้น {room.floor}
        </Typography>

        {/* amenities chips */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
          {amenities.map((am, idx) => (
            <Chip
              key={idx}
              size="small"
              label={am}
              icon={iconMap[am]}
              sx={{
                bgcolor: "#e8f0fe",
                color: "#1976d2",
                fontSize: "0.75rem",
              }}
            />
          ))}
        </Box>

        {/* ปุ่มจอง → เรียก onBook(room) */}
        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 1, py: 1.1, fontSize: "0.95rem" }}
          onClick={() => onBook(room)}
        >
          จองห้องนี้
        </Button>
      </CardContent>
    </Card>
  );
};

export default RoomCard;
