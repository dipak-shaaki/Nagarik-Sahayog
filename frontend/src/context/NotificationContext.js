import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000/api' : 'http://10.0.2.2:8000/api';

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async (showNotice = false) => {
        if (!user) return;
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(`${API_URL}/notifications/unread_count/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                if (showNotice && data.unread_count > unreadCount) {
                    Alert.alert(
                        "New Notification",
                        "You have received a new update on your report.",
                        [{ text: "View", onPress: () => { } }] // Navigation is tricky from context, keeping it simple
                    );
                }
                setUnreadCount(data.unread_count);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
            // Optional: Set up polling
            const interval = setInterval(() => fetchUnreadCount(true), 15000); // Check every 15 seconds
            return () => clearInterval(interval);
        } else {
            setUnreadCount(0);
        }
    }, [user, unreadCount]); // Include unreadCount in deps for the showNotice check to have correct prev value

    const markAllRead = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/notifications/mark_all_read/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    return (
        <NotificationContext.Provider value={{ unreadCount, setUnreadCount, fetchUnreadCount, markAllRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
