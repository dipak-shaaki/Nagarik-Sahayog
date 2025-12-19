import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

const CustomInput = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline }) => {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[styles.input, multiline && styles.multiline]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textLight}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                multiline={multiline}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 5,
        fontWeight: '600',
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    multiline: {
        height: 100,
        textAlignVertical: 'top',
    },
});

export default CustomInput;
