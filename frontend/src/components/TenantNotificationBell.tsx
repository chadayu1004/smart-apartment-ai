import React, { useEffect, useState } from "react";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Payments as PaymentsIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

type DepositStatus = "pending" | "paid" | "overdue";

interface DepositInfo {
  contract_id: number;
  room_id: number;
  deposit_status: DepositStatus;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  data?: any;
}

const TenantNotificationBell: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  // ดึงข้อมูลแจ้งเตือน + จำนวนที่ยังไม่อ่าน
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        api.get<NotificationItem[]>("/notifications/me"),
        api.get<{ unread_count: number }>("/notifications/me/unread-count"),
      ]);

      // แจ้งเตือนที่เกี่ยวกับมัดจำ (ถ้ามี)
      const depositNotification = listRes.data.find(
        (notif) => notif.type === "deposit_due"
      );
      if (depositNotification && depositNotification.data) {
        setDepositInfo(depositNotification.data as DepositInfo);
      } else {
        setDepositInfo(null);
      }

      setUnreadCount(countRes.data.unread_count || 0);
    } catch (error) {
      console.error("Error fetching notifications", error);
      setDepositInfo(null);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // กดที่ไอคอนกระดิ่ง
  const handleIconClick = async (
    event: React.MouseEvent<HTMLElement>
  ): Promise<void> => {
    setAnchorEl(event.currentTarget);

    // ถ้ามีแจ้งเตือนที่ยังไม่อ่าน → mark ว่าอ่านทั้งหมด แล้วเคลียร์ badge
    if (unreadCount > 0) {
      try {
        await api.post("/notifications/read-all");
        setUnreadCount(0);
      } catch (error) {
        console.error("Error marking notifications as read", error);
      }
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const goToPayments = () => {
    handleClose();
    navigate("/payments");
  };

  const pendingDeposit =
    depositInfo && depositInfo.deposit_status !== "paid";

  // แสดงตัวเลขตามจำนวนแจ้งเตือนที่ยังไม่อ่าน
  const badgeCount = unreadCount;

  return (
    <>
      <IconButton
        color="primary"
        onClick={handleIconClick}
        disabled={loading}
        sx={{
          bgcolor: "white",
          boxShadow: "0 4px 12px rgba(15,23,42,0.15)",
          "&:hover": { bgcolor: "#e0f2fe" },
        }}
      >
        <Badge
          color="error"
          badgeContent={badgeCount}
          overlap="circular"
          // ไม่ต้องใส่ showZero → ถ้า 0 จะไม่โชว์ badge ให้อัตโนมัติ
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {pendingDeposit ? (
          <MenuItem onClick={goToPayments}>
            <ListItemIcon>
              <PaymentsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="สัญญามัดจำรอการชำระ"
              secondary={`ห้องพัก ID: ${depositInfo?.room_id}`}
            />
          </MenuItem>
        ) : (
          <MenuItem disabled>
            <ListItemText primary="ยังไม่มีการแจ้งเตือนใหม่" />
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default TenantNotificationBell;
