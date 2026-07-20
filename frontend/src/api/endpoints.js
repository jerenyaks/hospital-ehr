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
  register: async (payload) => { const { data } = await api.post("/patients", payload); return data; },
  list: async (search = "") => { const { data } = await api.get("/patients", { params: search ? { search } : {} }); return data; },
  get: async (id) => { const { data } = await api.get(`/patients/${id}`); return data; },
};

export const visitsApi = {
  checkIn: async (patientId, chiefComplaint, visitType = "outpatient") => {
    const { data } = await api.post("/visits", { patient_id: patientId, chief_complaint: chiefComplaint, visit_type: visitType });
    return data;
  },
  list: async (statusFilter = null) => {
    const { data } = await api.get("/visits", { params: statusFilter ? { status_filter: statusFilter } : {} });
    return data;
  },
  getDetail: async (visitId) => { const { data } = await api.get(`/visits/${visitId}`); return data; },
  updateStatus: async (visitId, status) => { const { data } = await api.patch(`/visits/${visitId}/status`, { status }); return data; },
  recordVitals: async (visitId, vitals) => { const { data } = await api.post(`/visits/${visitId}/vitals`, vitals); return data; },
  addDiagnosis: async (visitId, diagnosis) => { const { data } = await api.post(`/visits/${visitId}/diagnoses`, diagnosis); return data; },
  addPrescription: async (visitId, prescription) => { const { data } = await api.post(`/visits/${visitId}/prescriptions`, prescription); return data; },
  getPatientHistory: async (patientId) => { const { data } = await api.get(`/visits/patient/${patientId}/history`); return data; },
  admit: async (visitId, ward, bedNumber) => { const { data } = await api.patch(`/visits/${visitId}/admit`, { ward, bed_number: bedNumber }); return data; },
  discharge: async (visitId, notes) => { const { data } = await api.patch(`/visits/${visitId}/discharge`, { discharge_notes: notes }); return data; },
  getActiveInpatients: async () => { const { data } = await api.get("/visits/inpatients/active"); return data; },
};

export const usersApi = {
  create: async (payload) => { const { data } = await api.post("/users", payload); return data; },
  list: async () => { const { data } = await api.get("/users"); return data; },
  deactivate: async (userId) => { const { data } = await api.patch(`/users/${userId}/deactivate`); return data; },
};

export const labApi = {
  getCatalog: async () => { const { data } = await api.get("/lab/catalog"); return data; },
  orderTest: async (payload) => { const { data } = await api.post("/lab/tests", payload); return data; },
  getPendingTests: async () => { const { data } = await api.get("/lab/tests/pending"); return data; },
  getVisitTests: async (visitId) => { const { data } = await api.get(`/lab/tests/visit/${visitId}`); return data; },
  recordResult: async (testId, payload) => { const { data } = await api.post(`/lab/tests/${testId}/results`, payload); return data; },
};

export const pharmacyApi = {
  getMedicines: async () => { const { data } = await api.get("/pharmacy/medicines"); return data; },
  addMedicine: async (payload) => { const { data } = await api.post("/pharmacy/medicines", payload); return data; },
  updateMedicine: async (id, payload) => { const { data } = await api.patch(`/pharmacy/medicines/${id}`, payload); return data; },
  getLowStock: async () => { const { data } = await api.get("/pharmacy/medicines/low-stock"); return data; },
  dispense: async (payload) => { const { data } = await api.post("/pharmacy/dispense", payload); return data; },
  getDispensings: async (prescriptionId) => { const { data } = await api.get(`/pharmacy/dispensings/prescription/${prescriptionId}`); return data; },
  getPendingPrescriptions: async () => { const { data } = await api.get("/pharmacy/prescriptions/pending"); return data; },
};

export const billingApi = {
  getReportsSummary: async () => { const { data } = await api.get("/billing/reports/summary"); return data; },
  generate: async (visitId) => { const { data } = await api.post(`/billing/generate/${visitId}`); return data; },
  getByVisit: async (visitId) => { const { data } = await api.get(`/billing/visit/${visitId}`); return data; },
  pay: async (billId, paymentMethod) => { const { data } = await api.patch(`/billing/${billId}/pay`, { payment_method: paymentMethod }); return data; },
  getUnpaid: async () => { const { data } = await api.get("/billing/unpaid"); return data; },
};