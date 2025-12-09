// src/pages/TenantCalendar.tsx
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

import type {
    DateSelectArg,
    EventClickArg,
    EventInput,
} from "@fullcalendar/core";

import api from "../services/api";
import type { CalendarEvent } from "./AdminCalendar";


type EventCategory = "task" | "event" | "appointment";

const TenantCalendar: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<CalendarEvent | null>(null);
    const [saving, setSaving] = useState(false);
    const [isCreate, setIsCreate] = useState(true);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await api.get<CalendarEvent[]>("/calendar/my-events");
            setEvents(res.data);
        } catch (err) {
            console.error("Error fetching tenant events:", err);
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
            title: ev.title,
            start: ev.start,
            end: ev.end || undefined,
            color:
                ev.owner_role === "admin"
                    ? "#0ea5e9" // โน้ตจากแอดมิน
                    : "#22c55e", // โน้ตส่วนตัวผู้เช่า
        }));

    const openCreateFromDate = (info: DateSelectArg) => {
        setIsCreate(true);
        setEditing({
            id: 0,
            title: "",
            description: "",
            start: info.startStr,
            end: info.endStr || info.startStr,
            category: "event",
            visibility: "tenant_only", // โน้ตส่วนตัว
            owner_role: "tenant",
        });
        setEditOpen(true);
    };

    const openEditFromEvent = (arg: EventClickArg) => {
        const found = events.find((e) => String(e.id) === arg.event.id);
        if (!found) return;

        // ถ้าเป็นโน้ตจากผู้ดูแล แก้ไขไม่ได้ ให้เป็นแค่ view
        if (found.owner_role === "admin") {
            alert(
                [
                    `จากผู้ดูแล: ${found.title}`,
                    found.description ? `รายละเอียด: ${found.description}` : "",
                    `เริ่ม: ${new Date(found.start).toLocaleString("th-TH")}`,
                    found.end
                        ? `สิ้นสุด: ${new Date(found.end).toLocaleString("th-TH")}`
                        : "",
                ]
                    .filter(Boolean)
                    .join("\n")
            );
            return;
        }

        setIsCreate(false);
        setEditing(found);
        setEditOpen(true);
    };

    const closeDialog = () => {
        if (saving) return;
        setEditOpen(false);
        setEditing(null);
    };

    const handleChange = (field: keyof CalendarEvent, value: any) => {
        setEditing((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

    const handleSave = async () => {
        if (!editing) return;
        if (!editing.title.trim()) {
            alert("กรุณากรอกหัวข้อโน้ต");
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
                visibility: "tenant_only", // ผู้เช่าเห็นคนเดียว
            };

            if (isCreate) {
                const res = await api.post<CalendarEvent>(
                    "/calendar/my-events",
                    payload
                );
                setEvents((prev) => [...prev, res.data]);
            } else {
                const res = await api.put<CalendarEvent>(
                    `/calendar/my-events/${editing.id}`,
                    payload
                );
                setEvents((prev) =>
                    prev.map((e) => (e.id === res.data.id ? res.data : e))
                );
            }

            closeDialog();
        } catch (err: any) {
            console.error("Error saving tenant event:", err);
            alert(
                "ไม่สามารถบันทึกโน้ตได้: " +
                (err?.response?.data?.detail || "Unknown error")
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editing || isCreate) {
            closeDialog();
            return;
        }
        if (!window.confirm("ต้องการลบโน้ตนี้หรือไม่?")) return;

        try {
            setSaving(true);
            await api.delete(`/calendar/my-events/${editing.id}`);
            setEvents((prev) => prev.filter((e) => e.id !== editing.id));
            closeDialog();
        } catch (err: any) {
            console.error("Error deleting tenant event:", err);
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
                        ปฏิทินส่วนตัวของฉัน
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        ดูโน้ตจากผู้ดูแล และบันทึกงาน / กิจกรรม / นัดหมายของคุณเอง
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchEvents}
                        disabled={loading}
                    >
                        รีโหลด
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
                        เพิ่มโน้ตของฉัน
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

            {/* DIALOG */}
            <Dialog open={editOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {isCreate ? "เพิ่มโน้ตของฉัน" : "แก้ไขโน้ตของฉัน"}
                </DialogTitle>
                <DialogContent dividers>
                    {editing && (
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

                            <Typography variant="caption" color="text.secondary">
                                * โน้ตของผู้เช่าจะมองเห็นได้เฉพาะคุณเท่านั้น
                            </Typography>
                        </Stack>
                    )}
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

export default TenantCalendar;
