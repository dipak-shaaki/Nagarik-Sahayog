#!/usr/bin/env node

/**
 * Script to update all files to use centralized API configuration
 * Run with: node update-api-imports.js
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'src/screens/ProfileScreen.js',
    'src/screens/ReportTrackingScreen.js',
    'src/screens/ReportScreen.js',
    'src/screens/MapScreen.js',
    'src/screens/HomeScreen.js',
    'src/screens/FieldOfficialDashboardScreen.js',
    'src/screens/CreateStaffScreen.js',
    'src/screens/CommunityFeedScreen.js',
    'src/screens/AdminDashboardScreen.js',
    'src/screens/AlertsScreen.js',
];

const oldPattern = /const API_URL = Platform\.OS === 'web' \? 'http:\/\/localhost:8000\/api' : 'http:\/\/10\.0\.2\.2:8000\/api';/g;
const oldPattern2 = /const BASE_URL = Platform\.OS === 'web' \? 'http:\/\/localhost:8000' : 'http:\/\/10\.0\.2\.2:8000';/g;

const newImport = "import { API_URL, BASE_URL } from '../config/api';";

filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${file}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file already has the import
    if (content.includes("from '../config/api'")) {
        console.log(`✓ Already updated: ${file}`);
        return;
    }

    // Remove old API_URL declaration
    if (oldPattern.test(content)) {
        content = content.replace(oldPattern, '');
        modified = true;
    }

    // Remove old BASE_URL declaration
    if (oldPattern2.test(content)) {
        content = content.replace(oldPattern2, '');
        modified = true;
    }

    // Add new import after other imports
    const importRegex = /(import.*from.*['"];?\n)+/;
    if (modified && importRegex.test(content)) {
        content = content.replace(importRegex, (match) => {
            return match + newImport + '\n';
        });
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated: ${file}`);
    } else {
        console.log(`- No changes needed: ${file}`);
    }
});

console.log('\n✅ Done! All files have been updated to use centralized API configuration.');
console.log('Make sure to restart your Expo development server for changes to take effect.');
