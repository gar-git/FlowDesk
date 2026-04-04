// action - state management
import { LOGIN, LOGOUT } from './actions';

// ==============================|| AUTH REDUCER ||============================== //

export const initialState = {
    isLoggedIn:     false,
    isInitialized:  false,
    user:           null,
};

const authReducer = (state = initialState, action) => {
    switch (action.type) {

        case LOGIN: {
            const { user } = action.payload;
            return {
                ...state,
                isLoggedIn:    true,
                isInitialized: true,
                user,
            };
        }

        case LOGOUT: {
            return {
                ...state,
                isInitialized: true,
                isLoggedIn:    false,
                user:          null,
            };
        }

        default:
            return { ...state };
    }
};

export default authReducer;
