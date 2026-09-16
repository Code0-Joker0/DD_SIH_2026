import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    getCurrentUser,
    loginUser,
    registerUser,
    logoutUser,
    getToken,
    getStoredUser
} from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => getStoredUser());
    const [token, setToken] = useState(() => getToken());
    const [isLoading, setIsLoading] = useState(true);

    // Restore and revalidate session on initial mount
    useEffect(() => {
        let isMounted = true;

        const verifySession = async () => {
            const activeToken = getToken();

            if (!activeToken) {
                if (isMounted) {
                    setUser(null);
                    setToken(null);
                    setIsLoading(false);
                }
                return;
            }

            try {
                const currentUser = await getCurrentUser();
                if (isMounted) {
                    if (currentUser) {
                        setUser(currentUser);
                        setToken(getToken());
                    } else {
                        // Token expired or invalid
                        setUser(null);
                        setToken(null);
                    }
                }
            } catch (err) {
                console.warn('[AUTH] Offline or session verification failed:', err.message);
                // Fall back to locally stored user profile if offline
                if (isMounted) {
                    setUser(getStoredUser());
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        verifySession();

        return () => {
            isMounted = false;
        };
    }, []);

    const login = async (email, password) => {
        const data = await loginUser(email, password);
        const authUser = data.user || data.data?.user;
        const authToken = data.token;

        setUser(authUser);
        setToken(authToken);
        return authUser;
    };

    const register = async ({ username, full_name, email, password, role = 'engineer' }) => {
        const data = await registerUser({
            username,
            full_name: full_name || username,
            email,
            password,
            role
        });
        const authUser = data.user || data.data?.user;
        const authToken = data.token;

        setUser(authUser);
        setToken(authToken);
        return authUser;
    };

    const logout = async () => {
        try {
            await logoutUser();
        } catch (_) {
            // Ignore network failures on client logout
        }
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;