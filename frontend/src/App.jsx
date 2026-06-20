import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ReceptionPage from "./pages/ReceptionPage";
import NursePage from "./pages/NursePage";
import DoctorPage from "./pages/DoctorPage";
import AdminPage from "./pages/AdminPage";

const ROLE_HOME = {
  admin: "/admin",
  doctor: "/doctor",
  nurse: "/nurse",
  receptionist: "/reception",
};

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || "/login"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route
        path="/reception"
        element={
          <ProtectedRoute allowedRoles={["receptionist", "admin"]}>
            <ReceptionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nurse"
        element={
          <ProtectedRoute allowedRoles={["nurse", "admin"]}>
            <NursePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={["doctor", "admin"]}>
            <DoctorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
