// src/pages/AdminCalendar.tsx
import React, { useEffect, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Stack,
    Typography,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
} from "@mui/material";
import {
    Event as EventIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
} from "@mui/icons-material";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";

// ✅ import เป็น type-only จาก core
import type {
    DateSelectArg,
    EventClickArg,
    EventInput,
} from "@fullcalendar/core";

import api from "../services/api";

type EventCategory = "task" | "event" | "appointment";
type Visibility = "admin_only" | "tenant_only" | "shared";
type OwnerRole = "admin" | "tenant";

export interface CalendarEvent {
    id: number;
    title: string;
    description?: string | null;
    start: string;
    end?: string | null;
    category: EventCategory;
    visibility: Visibility;
    owner_role: OwnerRole;
    room_id?: number | null;
    room_label?: string | null;
    color?: string | null;
}

const emptyEvent: CalendarEvent = {
    id: 0,
    title: "",
    description: "",
    start: "",
    end: "",
    category: "event",
    visibility: "shared",
    owner_role: "admin",
};

const AdminCalendar: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<CalendarEvent>(emptyEvent);
    const [saving, setSaving] = useState(false);
    const [isCreate, setIsCreate] = useState(true);

    // ---------- LOAD ----------
    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await api.get<CalendarEvent[]>("/calendar/admin-events");
            setEvents(res.data);
        } catch (err) {
            console.error("Error fetching admin calendar events:", err);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const mapToEventInput = (data: CalendarEvent[]): EventInput[] =>
        data.map((ev) => ({
            id: String(ev.id),
            title: ev.room_label ? `${ev.room_label} • ${ev.title}` : ev.title,
            start: ev.start,
            end: ev.end || undefined,
            color:
                ev.category === "task"
                    ? "#0ea5e9"
                    : ev.category === "appointment"
                        ? "#22c55e"
                        : "#6366f1",
        }));

    // ---------- OPEN DIALOG ----------
    const openCreateFromDate = (info: DateSelectArg) => {
        setIsCreate(true);
        setEditing({
            ...emptyEvent,
            start: info.startStr,
            end: info.endStr || info.startStr,
            visibility: "shared",
            category: "event",
            owner_role: "admin",
        });
        setEditOpen(true);
    };

    const openEditFromEvent = (arg: EventClickArg) => {
        const found = events.find((e) => String(e.id) === arg.event.id);
        if (!found) return;
        setIsCreate(false);
        setEditing(found);
        setEditOpen(true);
    };

    const closeDialog = () => {
        if (saving) return;
        setEditOpen(false);
    };

    const handleChange = (field: keyof CalendarEvent, value: any) => {
        setEditing((prev) => ({ ...prev, [field]: value }));
    };

    // ---------- SAVE / DELETE ----------
    const handleSave = async () => {
        if (!editing.title.trim()) {
            alert("กรุณากรอกชื่อโน้ต / เหตุการณ์");
            return;
        }
        if (!editing.start) {
            alert("กรุณาเลือกวันเวลาเริ่มต้น");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                title: editing.title.trim(),
                description: editing.description?.trim() || "",
                start: editing.start,
                end: editing.end || null,
                category: editing.category,
                visibility: editing.visibility === "tenant_only"
                    ? "shared"       // กันพลาด: admin สร้างได้แค่ admin_only/shared
                    : editing.visibility,
                owner_role: "admin",
                room_id: editing.room_id ?? null,
            };

            if (isCreate) {
                const res = await api.post<CalendarEvent>(
                    "/calendar/admin-events",
                    payload
                );
                setEvents((prev) => [...prev, res.data]);
            } else {
                const res = await api.put<CalendarEvent>(
                    `/calendar/admin-events/${editing.id}`,
                    payload
                );
                setEvents((prev) =>
                    prev.map((e) => (e.id === res.data.id ? res.data : e))
                );
            }

            setEditOpen(false);
        } catch (err: any) {
            console.error("Error saving admin event:", err);
            alert(
                "ไม่สามารถบันทึกโน้ตได้: " +
                (err?.response?.data?.detail || "Unknown error")
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (isCreate) {
            setEditOpen(false);
            return;
        }
        if (!window.confirm("ต้องการลบโน้ตนี้หรือไม่?")) return;

        try {
            setSaving(true);
            await api.delete(`/calendar/admin-events/${editing.id}`);
            setEvents((prev) => prev.filter((e) => e.id !== editing.id));
            setEditOpen(false);
        } catch (err: any) {
            console.error("Error deleting admin event:", err);
            alert(
                "ไม่สามารถลบโน้ตได้: " +
                (err?.response?.data?.detail || "Unknown error")
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
            {/* HEADER */}
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
            >
                <Box>
                    <Typography
                        variant="h5"
                        fontWeight="bold"
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                        <EventIcon color="primary" />
                        ปฏิทินห้องพัก &amp; เหตุการณ์
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        แอดมินสามารถบันทึกโน้ต งาน กิจกรรม หรือนัดหมาย
                        และเลือกได้ว่าจะให้ผู้เช่าเห็นหรือไม่
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchEvents}
                        disabled={loading}
                    >
                        รีโหลดข้อมูล
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() =>
                            openCreateFromDate({
                                start: new Date(),
                                end: new Date(),
                                startStr: new Date().toISOString(),
                                endStr: new Date().toISOString(),
                                allDay: false,
                                view: {} as any,
                            })
                        }
                    >
                        เพิ่มโน้ต / เหตุการณ์
                    </Button>
                </Stack>
            </Box>

            {/* CALENDAR */}
            <Card
                sx={{ borderRadius: 3, boxShadow: "0 8px 20px rgba(15,23,42,0.10)" }}
            >
                <CardContent>
                    {loading && (
                        <Box textAlign="center" mb={2}>
                            <CircularProgress size={22} />
                        </Box>
                    )}

                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        height="auto"
                        locale="th"
                        selectable
                        selectMirror
                        dayMaxEvents
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: "dayGridMonth,timeGridWeek,timeGridDay",
                        }}
                        events={mapToEventInput(events)}
                        select={openCreateFromDate}
                        eventClick={openEditFromEvent}
                    />
                </CardContent>
            </Card>

            {/* DIALOG CREATE / EDIT */}
            <Dialog open={editOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {isCreate ? "เพิ่มโน้ต / เหตุการณ์" : "แก้ไขโน้ต / เหตุการณ์"}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            label="หัวข้อ"
                            fullWidth
                            value={editing.title}
                            onChange={(e) => handleChange("title", e.target.value)}
                        />
                        <TextField
                            label="รายละเอียด"
                            fullWidth
                            multiline
                            minRows={3}
                            value={editing.description || ""}
                            onChange={(e) => handleChange("description", e.target.value)}
                        />

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="เวลาเริ่ม"
                                type="datetime-local"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={editing.start ? editing.start.slice(0, 16) : ""}
                                onChange={(e) =>
                                    handleChange(
                                        "start",
                                        new Date(e.target.value).toISOString()
                                    )
                                }
                            />
                            <TextField
                                label="เวลาสิ้นสุด"
                                type="datetime-local"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={editing.end ? editing.end.slice(0, 16) : ""}
                                onChange={(e) =>
                                    handleChange(
                                        "end",
                                        e.target.value
                                            ? new Date(e.target.value).toISOString()
                                            : null
                                    )
                                }
                            />
                        </Stack>

                        <TextField
                            select
                            label="ประเภทโน้ต"
                            fullWidth
                            value={editing.category}
                            onChange={(e) =>
                                handleChange("category", e.target.value as EventCategory)
                            }
                        >
                            <MenuItem value="task">งาน (Task)</MenuItem>
                            <MenuItem value="event">กิจกรรม (Event)</MenuItem>
                            <MenuItem value="appointment">นัดหมาย (Appointment)</MenuItem>
                        </TextField>

                        <TextField
                            select
                            label="การมองเห็น"
                            fullWidth
                            helperText="เลือกได้ว่าจะให้ผู้เช่าเห็นโน้ตนี้หรือใช้ภายในแอดมินเท่านั้น"
                            value={
                                editing.visibility === "tenant_only"
                                    ? "shared"
                                    : editing.visibility
                            }
                            onChange={(e) =>
                                handleChange(
                                    "visibility",
                                    e.target.value as Visibility
                                )
                            }
                        >
                            <MenuItem value="shared">แชร์ให้ผู้เช่าเห็น</MenuItem>
                            <MenuItem value="admin_only">เฉพาะแอดมินเท่านั้น</MenuItem>
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    {!isCreate && (
                        <Button
                            color="error"
                            onClick={handleDelete}
                            disabled={saving}
                            sx={{ mr: "auto" }}
                        >
                            ลบโน้ตนี้
                        </Button>
                    )}
                    <Button onClick={closeDialog} disabled={saving}>
                        ยกเลิก
                    </Button>
                    <Button onClick={handleSave} variant="contained" disabled={saving}>
                        {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default AdminCalendar;
