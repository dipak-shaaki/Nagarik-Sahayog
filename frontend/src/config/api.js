import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * API Configuration for different platforms
 * 
 * - Web: Uses localhost
 * - Android Emulator: Uses 10.0.2.2 (special alias for host machine)
 * - iOS Simulator: Uses localhost
 * - Physical Devices (Expo Go): Uses your computer's IP address on local network
 * 
 * IMPORTANT: Update YOUR_COMPUTER_IP with your actual IP address
 * To find your IP:
 * - Windows: Run `ipconfig` in Command Prompt, look for IPv4 Address
 * - Mac/Linux: Run `ifconfig` or `ip addr`, look for your local network IP
 * - Usually starts with 192.168.x.x or 10.0.x.x
 */

// CHANGE THIS TO YOUR COMPUTER'S IP ADDRESS ON YOUR LOCAL NETWORK
const YOUR_COMPUTER_IP = '10.10.255.10'; // Example: '192.168.1.100' or '10.0.0.5'

const getApiUrl = () => {
    if (Platform.OS === 'web') {
        // Web uses localhost
        return 'http://localhost:8000/api';
    }

    if (Platform.OS === 'android') {
        // For Expo Go, always use your computer's IP
        // Expo Go only runs on physical devices, not emulators
        return `http://${YOUR_COMPUTER_IP}:8000/api`;
    }

    if (Platform.OS === 'ios') {
        // iOS Simulator can use localhost
        // Physical iOS device needs your computer's IP
        const { isDevice } = Constants;

        if (isDevice) {
            return `http://${YOUR_COMPUTER_IP}:8000/api`;
        } else {
            return 'http://localhost:8000/api';
        }
    }

    // Fallback
    return 'http://localhost:8000/api';
};

export const API_URL = getApiUrl();
export const BASE_URL = API_URL.replace('/api', '');

// Helper function to check if API is reachable
export const checkApiConnection = async () => {
    try {
        const response = await fetch(`${API_URL}/departments/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.ok;
    } catch (error) {
        console.error('API Connection Error:', error);
        return false;
    }
};
