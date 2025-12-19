# Gemini API Key Setup Instructions

## How to Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

## Setting the API Key

### Option 1: Environment Variable (Recommended)
```bash
export GEMINI_API_KEY="your-api-key-here"
```

### Option 2: Add to your shell profile
Add this line to `~/.zshrc` or `~/.bashrc`:
```bash
export GEMINI_API_KEY="your-api-key-here"
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

### Option 3: Temporary (for testing)
```bash
# In the terminal where you run the server:
export GEMINI_API_KEY="your-api-key-here"
./.venv/bin/python manage.py runserver
```

## Testing the Priority System

1. **Set your API key** using one of the methods above

2. **Start the backend**:
   ```bash
   cd backend
   ./.venv/bin/python manage.py runserver
   ```

3. **Create a test report** via the frontend or API

4. **Check the console output** - you should see:
   ```
   AI Priority: 85 (CRITICAL) - Gas leak poses immediate life-threatening danger...
   Report #123 prioritized: 85 (CRITICAL)
   ```

## What the AI Analyzes

The Gemini AI considers:
- **Report Content**: Title and description for urgency keywords
- **Category**: Infrastructure criticality (water, electricity, roads, etc.)
- **Population Density**: Estimated from location coordinates
- **Location Clustering**: Number of similar reports nearby (within 500m)
- **Sensitive Locations**: Near hospitals, schools, temples, etc.
- **Photo Evidence**: Whether visual proof is provided

## Fallback Mode

If the API key is not set or the API fails, the system automatically falls back to a simple keyword-based scoring system. Reports will still be prioritized, just not as intelligently.

## Example Prompts the AI Receives

```
Title: URGENT: Gas leak on Main Street
Description: Strong smell of gas, multiple people reporting, near hospital
Category: Utilities
Population Density: Very High (Urban Core)
Nearby Reports: 3 similar reports
Sensitive Location: Yes (near hospital)
```

The AI will analyze this and return:
- Score: 95
- Level: CRITICAL
- Reasoning: "Gas leak in densely populated area near hospital poses immediate life-threatening danger. Multiple reports indicate widespread issue requiring urgent emergency response."
