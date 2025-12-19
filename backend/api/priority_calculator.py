"""
Priority Calculator for Report Prioritization System

This module calculates priority scores for citizen reports based on multiple factors:
- Category severity
- Keyword analysis
- Time sensitivity
- Location clustering
- Image evidence
"""

import math
from datetime import datetime, timedelta
from django.utils import timezone


# Category severity weights (out of 30 points)
CATEGORY_WEIGHTS = {
    'water': 30,
    'electricity': 30,
    'gas': 30,
    'road': 25,
    'bridge': 25,
    'traffic': 25,
    'health': 20,
    'garbage': 20,
    'drainage': 20,
    'sanitation': 20,
    'park': 15,
    'environment': 15,
    'pollution': 15,
    'tree': 15,
}

# Urgency keywords (out of 30 points)
URGENCY_KEYWORDS = {
    'emergency': 30,
    'urgent': 30,
    'danger': 30,
    'life-threatening': 30,
    'accident': 30,
    'critical': 30,
    'broken': 20,
    'damaged': 20,
    'flooding': 20,
    'flood': 20,
    'fire': 20,
    'leak': 20,
    'leaking': 20,
    'needs repair': 10,
    'not working': 10,
    'issue': 10,
    'problem': 10,
    'minor': 5,
    'cosmetic': 5,
    'suggestion': 5,
}


def calculate_priority(report):
    """
    Calculate priority score for a report (0-100)
    
    Args:
        report: Report model instance
        
    Returns:
        tuple: (priority_score, priority_level)
    """
    score = 0
    
    # 1. Category Severity (30 points)
    score += get_category_weight(report.category.name)
    
    # 2. Keyword Analysis (30 points)
    text = f"{report.title} {report.description}".lower()
    score += analyze_keywords(text)
    
    # 3. Time Sensitivity (20 points)
    score += calculate_time_score(report.created_at)
    
    # 4. Location Clustering (10 points)
    score += check_location_clustering(report)
    
    # 5. Image Evidence (10 points)
    if report.image:
        score += 10
    
    # Cap at 100
    score = min(score, 100)
    
    # Determine priority level
    if score >= 80:
        level = 'CRITICAL'
    elif score >= 60:
        level = 'HIGH'
    elif score >= 40:
        level = 'MEDIUM'
    else:
        level = 'LOW'
    
    return score, level


def get_category_weight(category_name):
    """Get severity weight for a category"""
    category_lower = category_name.lower()
    
    # Check for exact or partial matches
    for keyword, weight in CATEGORY_WEIGHTS.items():
        if keyword in category_lower:
            return weight
    
    # Default weight for unknown categories
    return 10


def analyze_keywords(text):
    """Analyze text for urgency keywords"""
    max_score = 0
    
    for keyword, score in URGENCY_KEYWORDS.items():
        if keyword in text:
            max_score = max(max_score, score)
    
    return max_score


def calculate_time_score(created_at):
    """Calculate score based on report age"""
    now = timezone.now()
    age = now - created_at
    
    # Reports older than 7 days get higher priority (aging issues)
    if age > timedelta(days=7):
        return 20
    # Fresh reports (less than 24 hours) also get attention
    elif age < timedelta(hours=24):
        return 10
    else:
        return 5


def check_location_clustering(report):
    """Check if multiple reports exist in same area"""
    from api.models import Report
    
    # Search for reports within ~500 meters (approx 0.005 degrees)
    radius = 0.005
    
    nearby_reports = Report.objects.filter(
        latitude__range=(report.latitude - radius, report.latitude + radius),
        longitude__range=(report.longitude - radius, report.longitude + radius),
        status__in=['PENDING', 'ASSIGNED']
    ).exclude(id=report.id)
    
    # If 2+ nearby reports, it's a widespread issue
    if nearby_reports.count() >= 2:
        return 10
    
    return 0
