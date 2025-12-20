import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { API_URL } from '../config/api';

const AuthContext = createContext();

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
            console.log('Attempting login with API_URL:', API_URL);
            console.log('Login endpoint:', `${API_URL}/auth/login/`);

            const response = await fetch(`${API_URL}/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password }),
            });

            console.log('Login response status:', response.status);
            const data = await response.json();
            console.log('Login response data:', data);

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
            console.error('Login error:', e);
            console.error('Error message:', e.message);
            return { success: false, message: `Connection error: ${e.message}` };
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
        setIsLoading(true);
        try {
            await AsyncStorage.removeItem('userToken');
            setUser(null);
        } catch (e) {
            console.error('Logout error', e);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshUser = async () => {
        await checkLoginStatus();
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, refreshUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
