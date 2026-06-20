import axios from "axios";

// In development the backend runs on :8000. When deploying for real,
// this should come from an environment variable instead of being
// hardcoded -- see the README for how to configure that.
const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the saved auth token to every outgoing request, if we have one.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ehr_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend ever says our token is invalid/expired, log the user out
// and send them back to the login screen rather than showing a confusing
// error.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("ehr_token");
      localStorage.removeItem("ehr_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
