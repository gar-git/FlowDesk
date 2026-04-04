import { createContext, useEffect, useReducer } from 'react';
import axiosServices from '../utils/axios';
import authReducer, { initialState } from './auth-reducer/auth';
import { LOGIN, LOGOUT } from './auth-reducer/actions';
import { useSnackbar } from '../utils/SnackbarProvider';
import { API_Route } from '../utils/apiRoute';
import { StatusCode } from '../utils/constants';
import LoadingScreen from '../commoncomponents/LoadingScreen/LoadingScreen';

// ==============================|| JWT CONTEXT ||============================== //

// Persist token in localStorage and attach it to every axios request
const setSession = (token) => {
    if (token) {
        localStorage.setItem('token', token);
        axiosServices.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axiosServices.defaults.headers.common['Authorization'];
    }
};

const JWTContext = createContext(null);

export const JWTProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);
    const { showSnackbar } = useSnackbar();

    // On app boot — verify the stored token by fetching the user profile
    useEffect(() => {
        initAuth();
    }, []);

    const initAuth = async () => {
        try {
            const token = localStorage.getItem('token');

            if (token) {
                setSession(token);
                const response = await axiosServices.get(API_Route.getProfile);

                if (response?.data?.statusCode === StatusCode.success) {
                    dispatch({
                        type: LOGIN,
                        payload: { user: response.data.data },
                    });
                } else {
                    setSession(null);
                    dispatch({ type: LOGOUT });
                }
            } else {
                dispatch({ type: LOGOUT });
            }
        } catch {
            setSession(null);
            dispatch({ type: LOGOUT });
        }
    };

    // Login — POST /users/login
    const login = async (email, password) => {
        try {
            const response = await axiosServices.post(API_Route.login, { email, password });

            if (response?.data?.statusCode === StatusCode.success) {
                const { token, user } = response.data.data;
                setSession(token);
                localStorage.setItem('user', JSON.stringify(user));

                dispatch({ type: LOGIN, payload: { user } });
                showSnackbar('Login successful', 'success');
                return { success: true };
            }

            const msg = response?.data?.message || 'Login failed.';
            showSnackbar(msg, 'error');
            return { success: false, message: msg };
        } catch (err) {
            const msg = err?.message || 'Something went wrong.';
            showSnackbar(msg, 'error');
            return { success: false, message: msg };
        }
    };

    // Signup — POST /users/signup
    const signup = async (data) => {
        try {
            const response = await axiosServices.post(API_Route.signup, data);

            if (response?.data?.statusCode === StatusCode.created) {
                showSnackbar('Account created! You can now log in.', 'success');
                return { success: true };
            }

            const msg = response?.data?.message || 'Signup failed.';
            showSnackbar(msg, 'error');
            return { success: false, message: msg };
        } catch (err) {
            const msg = err?.message || 'Something went wrong.';
            showSnackbar(msg, 'error');
            return { success: false, message: msg };
        }
    };

    // Logout — clear token and reset state
    const logout = () => {
        setSession(null);
        dispatch({ type: LOGOUT });
        showSnackbar('Logged out successfully', 'success');
        window.location.href = '/';
    };

    // Show full-screen loader until the initial auth check completes
    if (!state.isInitialized) {
        return <LoadingScreen />;
    }

    return (
        <JWTContext.Provider value={{ ...state, login, signup, logout, initAuth }}>
            {children}
        </JWTContext.Provider>
    );
};

export default JWTContext;
