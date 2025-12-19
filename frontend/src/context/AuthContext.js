import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const AuthContext = createContext();

// Use your computer's IP address if testing on a real device
const API_URL = Platform.OS === 'web' ? 'http://localhost:8000/api' : 'http://10.0.2.2:8000/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                // Fetch user profile from backend with token
                const response = await fetch(`${API_URL}/auth/me/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                } else {
                    // Token expired or invalid
                    await AsyncStorage.removeItem('userToken');
                }
            }
        } catch (e) {
            console.error('Failed to load login status', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (phone, password) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password }),
            });

            const data = await response.json();

            if (response.ok) {
                await AsyncStorage.setItem('userToken', data.access);
                // After getting token, fetch full user profile
                const profileRes = await fetch(`${API_URL}/auth/me/`, {
                    headers: { 'Authorization': `Bearer ${data.access}` }
                });
                const userData = await profileRes.json();
                setUser(userData);
                return { success: true };
            } else {
                return { success: false, message: data.detail || 'Login failed' };
            }
        } catch (e) {
            return { success: false, message: 'Server unreachable' };
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (formData) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                return { success: true };
            } else {
                const data = await response.json();
                return { success: false, message: JSON.stringify(data) || 'Register failed' };
            }
        } catch (e) {
            return { success: false, message: 'Server unreachable' };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('userToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
