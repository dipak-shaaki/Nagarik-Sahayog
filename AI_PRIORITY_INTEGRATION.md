# AI Priority System Integration - Summary

## Overview
Successfully integrated AI-powered priority calculation for citizen reports using Google's Gemini AI. The system automatically analyzes reports and assigns priority scores based on multiple contextual factors.

## Backend Changes

### 1. New Files Added
- **`backend/api/ai_priority.py`**: Core AI priority calculation module
  - `calculate_priority_with_ai()`: Main function using Gemini AI
  - `gather_context_data()`: Collects contextual information (nearby reports, population density, sensitive locations)
  - `build_priority_prompt()`: Constructs AI prompt with report details
  - `calculate_priority_fallback()`: Keyword-based fallback when AI is unavailable

### 2. Model Updates (`backend/api/models.py`)
Added three new fields to the `Report` model:
- `priority_level`: CharField with choices (LOW, MEDIUM, HIGH, CRITICAL)
- `priority_score`: IntegerField (0-100)
- `ai_reasoning`: TextField for AI's explanation

### 3. Views Updated (`backend/api/views.py`)
Modified `ReportViewSet.perform_create()` to:
- Automatically calculate AI priority when a report is created
- Save priority score, level, and reasoning to the database
- Gracefully handle AI failures with fallback

### 4. Configuration (`backend/core/settings.py`)
- Added `GEMINI_API_KEY` configuration
- Reads from environment variable or can be set directly

### 5. Dependencies (`backend/requirements.txt`)
- Added `google-generativeai` package

### 6. Database Migration
- Created and applied migration for new priority fields

## Frontend Changes

### 1. AdminDashboardScreen Updates
- **Added `getPriorityColor()` function**: Returns color codes for priority levels
  - CRITICAL: Red (#DC2626)
  - HIGH: Orange (#EA580C)
  - MEDIUM: Yellow (#CA8A04)
  - LOW: Green (#16A34A)

- **Updated Report Cards**: Now display priority badges with flame icon next to status
- **Detail Modal Enhancement**: Shows "AI Priority Analysis" section with:
  - Priority level and score (e.g., "HIGH (75/100)")
  - AI reasoning explanation

- **New Styles Added**:
  - `priorityBadge`: Styled badge for priority display
  - `priorityText`: Text styling for priority labels
  - `aiReasoningText`: Italic text for AI reasoning

## How It Works

### Priority Calculation Process
1. **Citizen submits report** → Report created in database
2. **AI Analysis triggered** → `calculate_priority_with_ai()` called
3. **Context gathered**:
   - Nearby reports within 500m radius
   - Population density estimation
   - Sensitive location detection (hospitals, schools, etc.)
4. **Gemini AI evaluates** based on:
   - Public safety risk
   - Infrastructure criticality
   - Urgency
   - Impact scope
   - Escalation potential
   - Location context
   - Pattern recognition
5. **Priority assigned** → Score (0-100), Level (LOW/MEDIUM/HIGH/CRITICAL), and Reasoning saved
6. **Fallback handling** → If AI fails, uses keyword-based scoring

### Priority Levels
- **CRITICAL (80-100)**: Immediate life-threatening danger, widespread issues
- **HIGH (60-79)**: Significant infrastructure problems, high impact
- **MEDIUM (40-59)**: Standard issues requiring attention
- **LOW (0-39)**: Minor cosmetic issues, suggestions

## Setup Requirements

### Environment Variable
Set the Gemini API key:
```bash
export GEMINI_API_KEY="your-api-key-here"
```

Or add it directly to `backend/core/settings.py`:
```python
GEMINI_API_KEY = "your-api-key-here"
```

### Installation
```bash
cd backend
pip install google-generativeai
python manage.py migrate
```

## Features

### Admin Dashboard
- ✅ Color-coded priority badges on report cards
- ✅ Priority level displayed alongside status
- ✅ Detailed AI reasoning in report details
- ✅ Visual priority indicators (flame icon)

### AI Capabilities
- ✅ Contextual analysis of report location
- ✅ Pattern detection (multiple reports in same area)
- ✅ Population density consideration
- ✅ Sensitive location awareness
- ✅ Intelligent fallback system

## Benefits
1. **Automated Triage**: Reports are automatically prioritized without manual review
2. **Data-Driven**: Uses contextual data and AI analysis for objective prioritization
3. **Transparent**: AI provides reasoning for its decisions
4. **Reliable**: Fallback system ensures functionality even without AI
5. **Scalable**: Can handle high volumes of reports efficiently

## Next Steps (Optional Enhancements)
- Add real-time priority recalculation based on report age
- Implement priority-based sorting in admin dashboard
- Add priority filters
- Create priority analytics dashboard
- Integrate with notification system for critical reports
- Add manual priority override capability for admins
