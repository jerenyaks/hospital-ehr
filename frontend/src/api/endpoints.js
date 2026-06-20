import api from "./client";

export const authApi = {
  login: async (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const { data } = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return data;
  },
};

export const patientsApi = {
  register: async (payload) => {
    const { data } = await api.post("/patients", payload);
    return data;
  },
  list: async (search = "") => {
    const { data } = await api.get("/patients", { params: search ? { search } : {} });
    return data;
  },
  get: async (id) => {
    const { data } = await api.get(`/patients/${id}`);
    return data;
  },
};

export const visitsApi = {
  checkIn: async (patientId, chiefComplaint) => {
    const { data } = await api.post("/visits", {
      patient_id: patientId,
      chief_complaint: chiefComplaint,
    });
    return data;
  },
  list: async (statusFilter = null) => {
    const { data } = await api.get("/visits", {
      params: statusFilter ? { status_filter: statusFilter } : {},
    });
    return data;
  },
  getDetail: async (visitId) => {
    const { data } = await api.get(`/visits/${visitId}`);
    return data;
  },
  updateStatus: async (visitId, status) => {
    const { data } = await api.patch(`/visits/${visitId}/status`, { status });
    return data;
  },
  recordVitals: async (visitId, vitals) => {
    const { data } = await api.post(`/visits/${visitId}/vitals`, vitals);
    return data;
  },
  addDiagnosis: async (visitId, diagnosis) => {
    const { data } = await api.post(`/visits/${visitId}/diagnoses`, diagnosis);
    return data;
  },
  addPrescription: async (visitId, prescription) => {
    const { data } = await api.post(`/visits/${visitId}/prescriptions`, prescription);
    return data;
  },
  getPatientHistory: async (patientId) => {
    const { data } = await api.get(`/visits/patient/${patientId}/history`);
    return data;
  },
};

export const usersApi = {
  create: async (payload) => {
    const { data } = await api.post("/users", payload);
    return data;
  },
  list: async () => {
    const { data } = await api.get("/users");
    return data;
  },
  deactivate: async (userId) => {
    const { data } = await api.patch(`/users/${userId}/deactivate`);
    return data;
  },
};
