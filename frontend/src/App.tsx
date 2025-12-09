import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Toolbar,
  IconButton,
  Tooltip,
  AppBar,
  Container,
  Button,
} from "@mui/material";
import {
  Home as HomeIcon,
  Dashboard as DashboardIcon,
  Login as LoginIcon,
  PersonAdd as RegisterIcon,
  Logout as LogoutIcon,
  BedroomParent as MyRoomIcon,
  Apartment as ApartmentIcon,
  Edit as EditIcon,
  Payments as PaymentsIcon,
  PeopleAlt as PeopleIcon,
  Campaign as CampaignIcon,
  Event as EventIcon, // ✅ ไอคอนปฏิทิน
} from "@mui/icons-material";

// Pages & Context
import PublicHome from "./pages/PublicHome";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRooms from "./pages/AdminRooms";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyRoom from "./pages/MyRoom";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import TenantPayments from "./pages/TenantPayments";
import TenantsPage from "./pages/TenantsPage";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import TenantFinances from "./pages/TenantFinances";

import { AuthProvider, useAuth } from "./context/AuthContext";
import TenantNotificationBell from "./components/TenantNotificationBell";
import TenantAnnouncements from "./pages/TenantAnnouncements";
import SpeedIcon from "@mui/icons-material/Speed";
import AdminMeters from "./pages/AdminMeters";
import AdminCalendar from "./pages/AdminCalendar";   // ✅ ใหม่
import TenantCalendar from "./pages/TenantCalendar"; // ✅ ใหม่

const drawerWidth = 260;

// ================= Sidebar =================
const Sidebar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    // ---------- TENANT ----------
    {
      text: "ห้องของฉัน",
      icon: <MyRoomIcon />,
      path: "/my-room",
      show: isAuthenticated && user?.user_role === "tenant",
    },
    {
      text: "การชำระเงิน & มัดจำ",
      icon: <PaymentsIcon />,
      path: "/payments",
      show: isAuthenticated && user?.user_role === "tenant",
    },
    {
      text: "ข่าวสาร / ประกาศ",
      icon: <CampaignIcon />,
      path: "/tenant/announcements",
      show: isAuthenticated && user?.user_role === "tenant",
    },
    {
      text: "ปฏิทินของฉัน",
      icon: <EventIcon />,
      path: "/tenant/calendar",
      show: isAuthenticated && user?.user_role === "tenant",
    },

    // ---------- ADMIN ----------
    {
      text: "Admin Panel",
      icon: <DashboardIcon />,
      path: "/dashboard",
      show: isAuthenticated && user?.user_role === "admin",
    },
    {
      text: "ข่าวสาร / ประกาศ",
      icon: <CampaignIcon />,
      path: "/admin/announcements",
      show: isAuthenticated && user?.user_role === "admin",
    },
    {
      text: "รายชื่อผู้เช่า / สัญญา",
      icon: <PeopleIcon />,
      path: "/admin/tenants",
      show: isAuthenticated && user?.user_role === "admin",
    },
    {
      text: "จัดการห้องพัก",
      icon: <ApartmentIcon />,
      path: "/admin/rooms",
      show: isAuthenticated && user?.user_role === "admin",
    },
    {
      text: "การชำระเงิน & มัดจำ",
      icon: <PaymentsIcon />,
      path: "/admin/tenant-finances",
      show: isAuthenticated && user?.user_role === "admin",
    },
    {
      text: "มิเตอร์น้ำ / ไฟ",
      icon: <SpeedIcon />,
      path: "/admin/meters",
      show: isAuthenticated && user?.user_role === "admin",
    },
    {
      text: "ปฏิทินห้องพัก",
      icon: <EventIcon />,
      path: "/admin/calendar",
      show: isAuthenticated && user?.user_role === "admin",
    },
  ];

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          bgcolor: "#1e293b",
          color: "#f8fafc",
        },
      }}
      variant="permanent"
      anchor="left"
    >
      {/* Logo */}
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 2,
        }}
      >
        <ApartmentIcon sx={{ mr: 1, color: "#38bdf8" }} />
        <Typography
          variant="h6"
          noWrap
          component="div"
          fontWeight="bold"
          sx={{ color: "#38bdf8" }}
        >
          Smart Apartment
        </Typography>
      </Toolbar>
      <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />

      {/* User info */}
      {isAuthenticated && (
        <Box
          sx={{
            p: 3,
            display: "flex",
            alignItems: "center",
            gap: 2,
            position: "relative",
          }}
        >
          <Avatar
            src={user?.profile_image}
            sx={{ bgcolor: "#3b82f6", width: 45, height: 45 }}
          >
            {user?.profile_image
              ? null
              : user?.user_name?.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              {user?.user_name}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#94a3b8", textTransform: "uppercase" }}
            >
              {user?.user_role}
            </Typography>
          </Box>

          <Tooltip title="แก้ไขโปรไฟล์">
            <IconButton
              component={Link}
              to="/profile"
              size="small"
              sx={{
                color: "#94a3b8",
                "&:hover": {
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Main menu */}
      <List sx={{ px: 2 }}>
        {menuItems.map(
          (item) =>
            item.show && (
              <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={isActive(item.path)}
                  sx={{
                    borderRadius: 2,
                    "&.Mui-selected": {
                      bgcolor: "rgba(56, 189, 248, 0.1)",
                      color: "#38bdf8",
                      "& .MuiListItemIcon-root": { color: "#38bdf8" },
                    },
                    "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive(item.path) ? "#38bdf8" : "#94a3b8",
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: "0.9rem",
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )
        )}
      </List>

      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)", mx: 2 }} />

      {/* Logout / Login */}
      <List sx={{ px: 2, pb: 2 }}>
        {isAuthenticated ? (
          <ListItem disablePadding>
            <ListItemButton
              onClick={logout}
              sx={{
                borderRadius: 2,
                color: "#ef4444",
                "&:hover": { bgcolor: "rgba(239, 68, 68, 0.1)" },
              }}
            >
              <ListItemIcon sx={{ color: "#ef4444", minWidth: 40 }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="ออกจากระบบ" />
            </ListItemButton>
          </ListItem>
        ) : (
          <>
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                component={Link}
                to="/login"
                selected={isActive("/login")}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ color: "#94a3b8", minWidth: 40 }}>
                  <LoginIcon />
                </ListItemIcon>
                <ListItemText primary="เข้าสู่ระบบ" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/register"
                selected={isActive("/register")}
                sx={{
                  borderRadius: 2,
                  bgcolor: "#3b82f6",
                  color: "white",
                  "&:hover": { bgcolor: "#2563eb" },
                }}
              >
                <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                  <RegisterIcon />
                </ListItemIcon>
                <ListItemText primary="สมัครสมาชิก" />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Drawer>
  );
};

// ================= Guest Navbar =================
const GuestNavbar = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Container maxWidth="lg">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              textDecoration: "none",
              color: "#1976d2",
              fontWeight: "bold",
            }}
          >
            🏙️ Smart Apartment
          </Typography>

          <Box>
            {isAuthenticated ? (
              <>
                <Typography
                  variant="subtitle1"
                  component="span"
                  sx={{ mr: 2, fontWeight: "bold" }}
                >
                  ยินดีต้อนรับ, {user?.user_name}
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={logout}
                  startIcon={<LogoutIcon />}
                >
                  ออกจากระบบ
                </Button>
              </>
            ) : (
              <>
                <Button
                  component={Link}
                  to="/"
                  startIcon={<HomeIcon />}
                  sx={{ mr: 1 }}
                >
                  หน้าหลัก
                </Button>
                <Button
                  component={Link}
                  to="/login"
                  startIcon={<LoginIcon />}
                  sx={{ mr: 1 }}
                >
                  เข้าสู่ระบบ
                </Button>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  startIcon={<RegisterIcon />}
                >
                  สมัครสมาชิก
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

// ================= Layout หลัก =================
const AppLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const isSidebarLayout =
    isAuthenticated &&
    (user?.user_role === "tenant" || user?.user_role === "admin");

  if (isSidebarLayout) {
    const landingPath = user?.user_role === "admin" ? "/dashboard" : "/my-room";

    return (
      <Box sx={{ display: "flex" }}>
        <Sidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: "#f1f5f9",
            minHeight: "100vh",
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
          }}
        >
          {/* แถบด้านบนของ portal: เฉพาะกระดิ่งฝั่ง tenant */}
          {user?.user_role === "tenant" && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mb: 2,
              }}
            >
              <TenantNotificationBell />
            </Box>
          )}

          <Routes>
            {/* root -> หน้าเริ่มต้นของ role */}
            <Route path="/" element={<Navigate to={landingPath} replace />} />

            {/* Tenant */}
            <Route path="/my-room" element={<MyRoom />} />
            <Route path="/payments" element={<TenantPayments />} />
            <Route
              path="/tenant/announcements"
              element={<TenantAnnouncements />}
            />
            <Route path="/tenant/calendar" element={<TenantCalendar />} />

            {/* Admin */}
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route
              path="/admin/rooms"
              element={
                user?.user_role === "admin" ? (
                  <AdminRooms />
                ) : (
                  <Navigate to={landingPath} replace />
                )
              }
            />
            <Route
              path="/admin/tenants"
              element={
                user?.user_role === "admin" ? (
                  <TenantsPage />
                ) : (
                  <Navigate to={landingPath} replace />
                )
              }
            />
            <Route
              path="/admin/tenant-finances"
              element={
                user?.user_role === "admin" ? (
                  <TenantFinances />
                ) : (
                  <Navigate to={landingPath} replace />
                )
              }
            />
            <Route
              path="/admin/meters"
              element={
                user?.user_role === "admin" ? (
                  <AdminMeters />
                ) : (
                  <Navigate to={landingPath} replace />
                )
              }
            />
            <Route
              path="/admin/calendar"
              element={
                user?.user_role === "admin" ? (
                  <AdminCalendar />
                ) : (
                  <Navigate to={landingPath} replace />
                )
              }
            />
            <Route
              path="/admin/announcements"
              element={
                user?.user_role === "admin" ? (
                  <AdminAnnouncements />
                ) : (
                  <Navigate to={landingPath} replace />
                )
              }
            />

            <Route path="/profile" element={<Profile />} />

            {/* admin ใช้หน้า Register เพื่อเพิ่มผู้เช่าใหม่ได้ */}
            <Route
              path="/register"
              element={
                user?.user_role === "admin" ? (
                  <Register />
                ) : (
                  <Navigate to={landingPath} replace />
                )
              }
            />

            {/* ไม่ให้เข้า login/forgot ซ้ำ */}
            <Route
              path="/login"
              element={<Navigate to={landingPath} replace />}
            />
            <Route
              path="/forgot-password"
              element={<Navigate to={landingPath} replace />}
            />

            <Route path="*" element={<Navigate to={landingPath} replace />} />
          </Routes>
        </Box>
      </Box>
    );
  }

  // ---------- Guest ----------
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f1f5f9" }}>
      <GuestNavbar />
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* กัน Guest ไม่ให้เข้า portal */}
          <Route path="/my-room" element={<Navigate to="/" replace />} />
          <Route path="/payments" element={<Navigate to="/" replace />} />
          <Route
            path="/tenant/announcements"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/tenant/calendar"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/admin/meters"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/admin/calendar"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/dashboard"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/admin/announcements"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/admin/tenants"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/admin/rooms"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/profile"
            element={<Navigate to="/" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </Box>
  );
};

// ================= Main App =================
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;
