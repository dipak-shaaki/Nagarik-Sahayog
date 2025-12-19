"""
AI-Powered Priority Calculator using Gemini API

This module uses Google's Gemini AI to intelligently analyze citizen reports
and assign priority scores based on multiple contextual factors.
"""

import os
import math
import google.generativeai as genai
from django.conf import settings


# Configure Gemini API
def configure_gemini():
    """Configure Gemini API with key from environment"""
    api_key = os.getenv('GEMINI_API_KEY', settings.GEMINI_API_KEY if hasattr(settings, 'GEMINI_API_KEY') else None)
    if api_key:
        genai.configure(api_key=api_key)
        return True
    return False


def calculate_priority_with_ai(report):
    """
    Calculate priority score using Gemini AI with contextual data
    
    Args:
        report: Report model instance
        
    Returns:
        tuple: (priority_score, priority_level, reasoning)
    """
    try:
        if not configure_gemini():
            print("WARNING: Gemini API key not configured, using fallback")
            return calculate_priority_fallback(report)
        
        # Gather contextual data
        context = gather_context_data(report)
        
        # Build prompt for Gemini
        prompt = build_priority_prompt(report, context)
        
        # Call Gemini API
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        # Parse response
        score, level, reasoning = parse_gemini_response(response.text)
        
        print(f"AI Priority: {score} ({level}) - {reasoning[:100]}...")
        return score, level, reasoning
        
    except Exception as e:
        print(f"AI Priority calculation failed: {e}, using fallback")
        return calculate_priority_fallback(report)


def gather_context_data(report):
    """Gather contextual data about the report location and history"""
    from api.models import Report
    
    context = {}
    
    # 1. Count nearby reports (within ~500m radius)
    radius = 0.005
    nearby_reports = Report.objects.filter(
        latitude__range=(report.latitude - radius, report.latitude + radius),
        longitude__range=(report.longitude - radius, report.longitude + radius),
        status__in=['PENDING', 'ASSIGNED', 'IN_PROGRESS']
    ).exclude(id=report.id if report.id else 0)
    
    context['nearby_reports_count'] = nearby_reports.count()
    context['nearby_reports_categories'] = list(nearby_reports.values_list('category__name', flat=True).distinct())
    
    # 2. Estimate population density (simplified - you can enhance this with real data)
    # For now, use a simple heuristic based on location
    # Kathmandu city center: ~27.7172, 85.3240
    city_center_lat, city_center_lon = 27.7172, 85.3240
    distance_from_center = math.sqrt(
        (report.latitude - city_center_lat)**2 + 
        (report.longitude - city_center_lon)**2
    )
    
    if distance_from_center < 0.02:  # ~2km from center
        context['population_density'] = 'Very High (Urban Core)'
    elif distance_from_center < 0.05:  # ~5km
        context['population_density'] = 'High (Urban)'
    elif distance_from_center < 0.1:  # ~10km
        context['population_density'] = 'Medium (Suburban)'
    else:
        context['population_density'] = 'Low (Rural)'
    
    # 3. Check if location is sensitive (near hospitals, schools, etc.)
    # This is simplified - you can add a database of sensitive locations
    sensitive_keywords = ['hospital', 'school', 'temple', 'airport', 'station']
    context['is_sensitive_location'] = any(
        keyword in report.location_address.lower() 
        for keyword in sensitive_keywords
    ) if report.location_address else False
    
    return context


def build_priority_prompt(report, context):
    """Build the prompt for Gemini AI"""
    
    prompt = f"""You are an intelligent civic issue prioritization system for a city management platform.

Analyze this citizen report and assign a priority score from 0-100, where:
- 0-39: LOW priority
- 40-59: MEDIUM priority  
- 60-79: HIGH priority
- 80-100: CRITICAL priority

**Report Details:**
- Title: {report.title}
- Description: {report.description}
- Category: {report.category.name}
- Location: {report.location_address or 'Not specified'}
- Has Photo Evidence: {'Yes' if report.image else 'No'}

**Contextual Factors:**
- Population Density: {context['population_density']}
- Nearby Similar Reports: {context['nearby_reports_count']} reports within 500m radius
- Nearby Report Categories: {', '.join(context['nearby_reports_categories']) if context['nearby_reports_categories'] else 'None'}
- Sensitive Location: {'Yes' if context['is_sensitive_location'] else 'No'}

**Consider these factors:**
1. **Public Safety Risk**: Does this pose immediate danger to citizens?
2. **Infrastructure Criticality**: How essential is this infrastructure?
3. **Urgency**: How quickly does this need attention?
4. **Impact Scope**: How many people are affected?
5. **Escalation Potential**: Could this get worse if ignored?
6. **Location Context**: Population density and sensitivity of location
7. **Pattern Recognition**: Are there multiple similar reports nearby?

**Response Format (IMPORTANT - Follow exactly):**
SCORE: [number 0-100]
LEVEL: [CRITICAL/HIGH/MEDIUM/LOW]
REASONING: [2-3 sentences explaining your decision]

Example:
SCORE: 85
LEVEL: CRITICAL
REASONING: Gas leak poses immediate life-threatening danger in a densely populated area. Multiple nearby reports indicate widespread issue requiring urgent response.
"""
    
    return prompt


def parse_gemini_response(response_text):
    """Parse Gemini's response to extract score, level, and reasoning"""
    try:
        lines = response_text.strip().split('\n')
        score = 50  # default
        level = 'MEDIUM'
        reasoning = ''
        
        for line in lines:
            line = line.strip()
            if line.startswith('SCORE:'):
                score_str = line.replace('SCORE:', '').strip()
                score = int(''.join(filter(str.isdigit, score_str)))
                score = max(0, min(100, score))  # Clamp to 0-100
            elif line.startswith('LEVEL:'):
                level = line.replace('LEVEL:', '').strip().upper()
                if level not in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
                    level = 'MEDIUM'
            elif line.startswith('REASONING:'):
                reasoning = line.replace('REASONING:', '').strip()
        
        # If reasoning spans multiple lines, capture it
        if 'REASONING:' in response_text:
            reasoning_start = response_text.index('REASONING:') + len('REASONING:')
            reasoning = response_text[reasoning_start:].strip()
        
        return score, level, reasoning
        
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        return 50, 'MEDIUM', 'AI analysis unavailable'


def calculate_priority_fallback(report):
    """Fallback priority calculation without AI"""
    score = 50  # Default medium priority
    
    # Simple keyword-based scoring
    text = f"{report.title} {report.description}".lower()
    
    if any(word in text for word in ['urgent', 'emergency', 'danger', 'critical']):
        score = 80
    elif any(word in text for word in ['broken', 'damaged', 'leak', 'flood']):
        score = 65
    elif any(word in text for word in ['minor', 'cosmetic', 'suggestion']):
        score = 30
    
    # Adjust for category
    category_lower = report.category.name.lower()
    if any(word in category_lower for word in ['water', 'electricity', 'gas']):
        score += 15
    
    # Determine level
    if score >= 80:
        level = 'CRITICAL'
    elif score >= 60:
        level = 'HIGH'
    elif score >= 40:
        level = 'MEDIUM'
    else:
        level = 'LOW'
    
    reasoning = f"Fallback scoring based on keywords and category ({report.category.name})"
    
    return score, level, reasoning
