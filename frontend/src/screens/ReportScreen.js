import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import ScreenWrapper from '../components/ScreenWrapper';
import { CATEGORIES } from '../constants/categories';
import { COLORS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000/api' : 'http://10.10.254.243:8000/api';

const ReportScreen = ({ navigation, route }) => {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState(null);
    const [locationAddress, setLocationAddress] = useState('');
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [image, setImage] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const response = await fetch(`${API_URL}/departments/`);
            const data = await response.json();
            if (response.ok) {
                setDepartments(data);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    // Verify selected location from MapScreen
    useEffect(() => {
        if (route.params?.selectedLocation) {
            setLocation(route.params.selectedLocation);
            // Reverse geocode the selected location to get address
            reverseGeocode(route.params.selectedLocation);
        }
    }, [route.params?.selectedLocation]);

    const reverseGeocode = async (coords) => {
        try {
            const result = await Location.reverseGeocodeAsync(coords);
            if (result.length > 0) {
                const addr = result[0];
                // Build address from available components
                const parts = [
                    addr.name,
                    addr.street,
                    addr.district,
                    addr.city,
                    addr.region
                ].filter(Boolean);

                const addressString = parts.length > 0
                    ? parts.join(', ')
                    : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
                setLocationAddress(addressString);
            } else {
                setLocationAddress(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
            }
        } catch (error) {
            console.log('Reverse geocoding failed', error);
            setLocationAddress(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        }
    };

    const getCurrentLocation = async () => {
        setIsFetchingLocation(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Permission to access location was denied');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);
            reverseGeocode(loc.coords);
        } catch (error) {
            Alert.alert('Error', 'Could not fetch location');
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required to take photos');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleImageAction = () => {
        if (Platform.OS === 'web') {
            pickImage();
        } else {
            Alert.alert('Upload Photo', 'Choose an option', [
                { text: 'Camera', onPress: takePhoto },
                { text: 'Gallery', onPress: pickImage },
                { text: 'Cancel', style: 'cancel' }
            ]);
        }
    };

    const handleSubmit = async () => {
        if (!title) {
            Alert.alert('Error', 'Please provide a title');
            return;
        }
        if (!location) {
            Alert.alert('Error', 'Please select a location');
            return;
        }
        if (!selectedCategory) {
            Alert.alert('Error', 'Please select a category');
            return;
        }
        if (!description) {
            Alert.alert('Error', 'Please provide a description');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const data = new FormData();
            data.append('title', title);
            data.append('description', description);
            data.append('category', selectedCategory);
            data.append('latitude', location.latitude.toString());
            data.append('longitude', location.longitude.toString());
            data.append('location_address', locationAddress);

            if (image) {
                if (Platform.OS === 'web') {
                    const response = await fetch(image);
                    const blob = await response.blob();
                    data.append('image', blob, 'report_image.jpg');
                } else {
                    const filename = image.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image`;
                    data.append('image', { uri: image, name: filename, type });
                }
            }

            const response = await fetch(`${API_URL}/reports/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    // Browser/Expo usually handles multipart boundaries correctly if we don't set Content-Type manually
                },
                body: data
            });

            if (response.ok) {
                Alert.alert('Success', 'Report submitted successfully!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                const errData = await response.json();
                console.log('Submission error:', errData);
                const errorMsg = typeof errData === 'object'
                    ? Object.entries(errData).map(([key, val]) => `${key}: ${val}`).join('\n')
                    : 'Failed to submit report. Please check your data.';
                Alert.alert('Submission Error', errorMsg);
            }
        } catch (error) {
            console.error('Submission catch:', error);
            Alert.alert('Error', 'An error occurred while connecting to the server');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openMapSelection = () => {
        navigation.navigate('MapScreen', {
            selectionMode: true,
            initialLocation: location,
            // Param to indicate we are coming from report screen
        });
    };

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('reportIssue')}</Text>
                </View>

                <View style={styles.form}>
                    {/* Title Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Title</Text>
                        <CustomInput
                            placeholder="e.g. Broken streetlight, Pothole..."
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* Location Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Location</Text>
                        <View style={styles.locationContainer}>
                            {location ? (
                                <View style={styles.locationInfo}>
                                    <Ionicons name="location" size={24} color={COLORS.primary} />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.addressText}>{locationAddress || "Location Selected"}</Text>
                                        <Text style={styles.coordsText}>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setLocation(null)} style={{ padding: 5 }}>
                                        <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <Text style={styles.placeholderText}>No location selected</Text>
                            )}

                            <View style={styles.locationButtons}>
                                <TouchableOpacity
                                    style={[styles.locationBtn, styles.gpsBtn]}
                                    onPress={getCurrentLocation}
                                    disabled={isFetchingLocation}
                                >
                                    {isFetchingLocation ? (
                                        <ActivityIndicator size="small" color={COLORS.white} />
                                    ) : (
                                        <>
                                            <Ionicons name="navigate" size={18} color={COLORS.white} />
                                            <Text style={styles.gpsBtnText}>Use Current Location</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.locationBtn, styles.mapBtn]}
                                    onPress={openMapSelection}
                                >
                                    <Ionicons name="map" size={18} color={COLORS.primary} />
                                    <Text style={styles.mapBtnText}>Select on Map</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Category Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('category') || 'Category'}</Text>
                        <View style={styles.categoryGrid}>
                            {departments.map((dept) => {
                                // Try to find a matching icon/color from our constants
                                const fallback = CATEGORIES.find(c => c.name.toLowerCase() === dept.name.toLowerCase()) ||
                                    CATEGORIES[CATEGORIES.length - 1]; // "Other"

                                return (
                                    <TouchableOpacity
                                        key={dept.id}
                                        style={[
                                            styles.categoryButton,
                                            selectedCategory === dept.id && { backgroundColor: fallback.color, borderColor: fallback.color }
                                        ]}
                                        onPress={() => setSelectedCategory(dept.id)}
                                    >
                                        <Ionicons
                                            name={fallback.icon}
                                            size={24}
                                            color={selectedCategory === dept.id ? COLORS.white : fallback.color}
                                        />
                                        <Text style={[
                                            styles.categoryText,
                                            selectedCategory === dept.id && styles.selectedCategoryText,
                                            { color: selectedCategory === dept.id ? COLORS.white : COLORS.text }
                                        ]}>
                                            {dept.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {departments.length === 0 && <Text style={styles.placeholderText}>Loading departments...</Text>}
                    </View>

                    {/* Image Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Photo Evidence</Text>
                        <TouchableOpacity style={styles.imageUpload} onPress={handleImageAction}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.uploadedImage} />
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <Ionicons name="camera" size={40} color={COLORS.textLight} />
                                    <Text style={styles.uploadText}>{t('attachMedia')}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Description Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('description')}</Text>
                        <CustomInput
                            placeholder="Describe the issue in detail..."
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            style={{ height: 100, textAlignVertical: 'top' }}
                        />
                    </View>

                    <CustomButton
                        title={t('submitReport')}
                        onPress={handleSubmit}
                        isLoading={isSubmitting}
                    />
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    closeButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    form: {
        gap: 24,
    },
    section: {
        gap: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginLeft: 4,
    },
    locationContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#eee',
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    addressText: {
        fontWeight: '600',
        color: COLORS.text,
        fontSize: 14,
    },
    coordsText: {
        color: COLORS.textLight,
        fontSize: 12,
    },
    placeholderText: {
        color: COLORS.textLight,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 15,
    },
    locationButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    locationBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    gpsBtn: {
        backgroundColor: COLORS.primary,
    },
    mapBtn: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    gpsBtnText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 13,
    },
    mapBtnText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 13,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    categoryButton: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
        backgroundColor: COLORS.surface,
        borderColor: '#eee',
        // Shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    categoryText: {
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    selectedCategoryText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
    imageUpload: {
        height: 200,
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadText: {
        marginTop: 10,
        color: COLORS.textLight,
    },
});

export default ReportScreen;
