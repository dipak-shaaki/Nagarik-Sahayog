import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { ALERTS } from '../data/dummy';
import { Ionicons } from '@expo/vector-icons';

const AlertsScreen = () => {
    const { t } = useLanguage();

    const getAlertColor = (level) => {
        switch (level) {
            case 'High': return COLORS.danger;
            case 'Medium': return COLORS.warning;
            default: return COLORS.primary;
        }
    };

    const renderItem = ({ item }) => (
        <View style={[styles.card, SHADOWS.small, { borderLeftColor: getAlertColor(item.level), borderLeftWidth: 5 }]}>
            <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                    <Ionicons name="warning" size={24} color={getAlertColor(item.level)} />
                    <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
                <Text style={[styles.levelText, { color: getAlertColor(item.level) }]}>{item.level} Priority</Text>
            </View>
            <Text style={styles.cardDesc}>{item.description}</Text>
            <Text style={styles.cardDate}>{item.date}</Text>
        </View>
    );

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={styles.title}>{t('disasterAlert')}</Text>
                <FlatList
                    data={ALERTS}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingBottom: 0,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 20,
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginBottom: 15,
        padding: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    levelText: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    cardDesc: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 10,
        lineHeight: 20,
    },
    cardDate: {
        fontSize: 12,
        color: COLORS.textLight,
    },
});

export default AlertsScreen;
