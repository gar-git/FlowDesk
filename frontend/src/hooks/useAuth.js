import { useContext } from 'react';
import JWTContext from '../context/JWTContext';

// ==============================|| AUTH HOOK ||============================== //

const useAuth = () => {
    const context = useContext(JWTContext);
    if (!context) throw new Error('useAuth must be used inside JWTProvider');
    return context;
};

export default useAuth;
