// src/pages/AdminAnnouncements.tsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from "@mui/material";
import {
  Campaign as CampaignIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import api from "../services/api";

interface Announcement {
  id?: number;
  title: string;
  content: string;
  created_at?: string;
}

const formatDateTime = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get<Announcement[]>("/announcements/");
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      alert("ไม่สามารถโหลดข่าวสารได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openCreateDialog = () => {
    setEditingItem(null);
    setTitle("");
    setContent("");
    setDialogOpen(true);
  };

  const openEditDialog = (item: Announcement) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("กรุณากรอกหัวข้อข่าวสาร");
      return;
    }
    if (!content.trim()) {
      alert("กรุณากรอกเนื้อหาข่าวสาร");
      return;
    }

    setSaving(true);
    try {
      if (editingItem && editingItem.id) {
        await api.put(`/announcements/${editingItem.id}`, {
          title: title.trim(),
          content: content.trim(),
        });
      } else {
        await api.post("/announcements/", {
          title: title.trim(),
          content: content.trim(),
        });
      }
      await fetchAnnouncements();
      setDialogOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error("Error saving announcement:", err);
      alert("ไม่สามารถบันทึกข่าวสารได้");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Announcement) => {
    if (!item.id) return;
    if (!window.confirm(`ยืนยันการลบประกาศ: "${item.title}" ?`)) return;

    try {
      await api.delete(`/announcements/${item.id}`);
      await fetchAnnouncements();
    } catch (err) {
      console.error("Error deleting announcement:", err);
      alert("ไม่สามารถลบข่าวสารได้");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Header */}
      <Box
        mb={3}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Box display="flex" alignItems="center" gap={1}>
          <CampaignIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              ข่าวสาร / ประกาศถึงผู้เช่า
            </Typography>
            <Typography variant="body2" color="text.secondary">
              จัดการข่าวสารสำคัญ ประกาศแจ้งเตือน และข้อมูลอัปเดตของอพาร์ตเมนต์
            </Typography>
          </Box>
        </Box>

        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchAnnouncements}
          >
            รีโหลด
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
          >
            เพิ่มข่าวสาร
          </Button>
        </Box>
      </Box>

      {/* List */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: "0 8px 20px rgba(15,23,42,0.12)",
        }}
      >
        <CardContent>
          {loading ? (
            <Typography>กำลังโหลด...</Typography>
          ) : announcements.length === 0 ? (
            <Typography color="text.secondary">
              ยังไม่มีข่าวสารในระบบ คลิก “เพิ่มข่าวสาร” เพื่อสร้างประกาศแรก
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {announcements.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1.5,
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      mb={0.5}
                    >
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        sx={{ wordBreak: "break-word" }}
                      >
                        {item.title}
                      </Typography>
                      <Chip
                        size="small"
                        label="ประกาศ"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-line",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      อัปเดตล่าสุด: {formatDateTime(item.created_at)}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={() => openEditDialog(item)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(item)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Dialog: เพิ่ม/แก้ไข ข่าวสาร */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? "แก้ไขข่าวสาร / ประกาศ" : "เพิ่มข่าวสาร / ประกาศใหม่"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="หัวข้อข่าว / หัวข้อประกาศ"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label="รายละเอียดข่าวสาร"
              fullWidth
              multiline
              minRows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            ยกเลิก
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกข่าวสาร"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminAnnouncements;
