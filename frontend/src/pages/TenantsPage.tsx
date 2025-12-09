// src/pages/TenantsPage.tsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  TextField,
  Grid,
  Paper,
  Chip,
} from "@mui/material";
import api from "../services/api";
import TenantCard from "../components/TenantCard";

interface Tenant {
  id?: number;
  first_name: string;
  last_name: string;
  phone: string;
  id_card_number: string;
  status: string;
}

const TenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");

  const fetchTenants = async () => {
    try {
      const res = await api.get("/tenants/");
      setTenants(res.data);
    } catch (err) {
      console.error("Error fetching tenants:", err);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const filtered = tenants.filter((t) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    const fullName = `${t.first_name} ${t.last_name}`.toLowerCase();
    return (
      fullName.includes(keyword) ||
      (t.phone || "").includes(keyword) ||
      (t.id_card_number || "").includes(keyword)
    );
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, pb: 6 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        mb={3}
        gap={2}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: "#1976d2" }}
          >
            🏠 รายชื่อผู้เช่าปัจจุบัน
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ดูข้อมูลผู้เช่า ค้นหาตามชื่อ เบอร์โทร หรือเลขบัตรประชาชน
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            ทั้งหมด
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {tenants.length}
          </Typography>
        </Paper>
      </Box>

      {/* Search bar */}
      <Box
        mb={3}
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        gap={2}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <TextField
          fullWidth
          label="ค้นหาผู้เช่า (ชื่อ, เบอร์โทร, เลขบัตร)"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Chip
          label={`แสดง ${filtered.length} รายการ`}
          color="primary"
          variant="outlined"
        />
      </Box>

      {/* List */}
      {filtered.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          ยังไม่มีผู้เช่าในระบบ หรือไม่พบข้อมูลตามเงื่อนไขค้นหา
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filtered.map((tenant) => (
            <TenantCard key={tenant.id} tenant={tenant} />
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default TenantsPage;
