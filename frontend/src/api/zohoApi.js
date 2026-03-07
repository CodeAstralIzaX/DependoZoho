import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000"
});

export const setAuth = (data) => API.post("/auth", data);

export const authStatus = () => API.get("/auth/status");

export const listMappings = (layoutId) =>
  API.get("/mappings", { params: { layoutId } });

export const uploadExcel = (layoutId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  return API.post(`/dependency/upload?layoutId=${layoutId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};