import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

/**
 * Access token lives in memory (also set as httpOnly cookie by the server,
 * but we send it as a Bearer header + socket handshake auth).
 */
let accessToken = null;
const tokenListeners = new Set();

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
  tokenListeners.forEach((fn) => fn(token));
};
export const onTokenChange = (fn) => {
  tokenListeners.add(fn);
  return () => tokenListeners.delete(fn);
};

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // refresh token cookie
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/** Single in-flight refresh shared by all 401-ed requests. */
let refreshPromise = null;

export const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    // One retry after a refresh for expired access tokens
    if (response?.status === 401 && !config._retried && !config.url.includes("/auth/")) {
      config._retried = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  }
);

/** Normalizes API errors to a friendly message string. */
export const apiMessage = (error, fallback = "Something went wrong") => {
  const data = error?.response?.data;
  if (data?.errors?.length) return data.errors.map((e) => e.message).join(". ");
  return data?.message || error?.message || fallback;
};

export default api;
