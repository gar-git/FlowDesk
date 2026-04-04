import axios from "axios";

const axiosServices = axios.create({
    baseURL: import.meta.env.VITE_FRONTEND_API_URL,
});

// Request Interceptor
axiosServices.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
axiosServices.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            // Session expired or invalid token
            if (error.response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
            }

            return Promise.reject(error.response.data);
        }

        return Promise.reject({ message: "Network error. Please try again." });
    }
);

export default axiosServices; 