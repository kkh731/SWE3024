# ai_engine.py
import os
import json
from sqlalchemy.orm import Session
from typing import List
import google.generativeai as genai
from dotenv import load_dotenv
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

import crud
import models
import schemas
from fastapi import HTTPException
from datetime import datetime, timedelta

# .env 파일에서 환경 변수 로드
load_dotenv()

# Outdoor activity keywords for weather search trigger
OUTDOOR_KEYWORDS = ['run', 'hike', 'outside', 'picnic', 'walk', 'cycling', 'park',
                  '달리기', '등산', '산책', '소풍', '야외', '자전거', '공원']

# --------------------------------------------------------------------------
# 1. 모델 및 API 설정 (Model & API Configuration)
# --------------------------------------------------------------------------
try:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        print("Warning: GEMINI_API_KEY not found. AI features will not work.")
    else:
        genai.configure(api_key=gemini_api_key)
except Exception as e:
    print(f"Error configuring Gemini API: {e}")

# Google Custom Search API settings
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
CUSTOM_SEARCH_ENGINE_ID = os.getenv("CUSTOM_SEARCH_ENGINE_ID")

# --------------------------------------------------------------------------
# 2. 프롬프트 관리 (Prompt Engineering)
# --------------------------------------------------------------------------
# ... (rest of the prompt templates are unchanged)
PERSONA_UPDATE_PROMPT_TEMPLATE = """
You are a productivity analyst AI. Your task is to update a user's persona based on their recent activity.
Analyze the original persona and the user's schedule history from the last 30 days.
Identify patterns, such as the time of day they are most productive, the types of tasks they complete successfully, and the tasks they tend to miss.
Generate a new, updated persona description that merges the user's core identity with these new data-driven insights.
The new persona should be a more accurate and nuanced reflection of the user's actual behavior.

- The user's preferred times and focus duration should be preserved unless the data strongly suggests a change.
- The output must be a single, continuous block of text for the new persona. Do not output anything else.

# Original Persona
{original_persona}

# Recent Schedule History (Last 30 Days)
{schedule_history}

# Updated Persona Description:
"""

FINAL_RECOMMENDATION_PROMPT_TEMPLATE = """
You are a helpful AI assistant that creates a schedule based on user requests.
Analyze all the provided context to create an optimized and practical plan.

# User Persona
{persona_details}

# External Context
- Public Holidays: {holidays}
- Weather Forecast: {weather}

# Existing Schedules in the requested period
{existing_schedules}

# User Request
- Goal: "{user_prompt}"
- Period: {start_date} to {end_date}

# Instructions
1. Do not overlap with existing schedules.
2. Do not schedule work-related tasks on public holidays.
3. Do not schedule outdoor activities on days with bad weather (e.g., rain, storm).
4. Prioritize the user's preferred times if possible.
5. Create schedule blocks that respect the user's focus duration.
6. Generate a concrete and actionable plan.
7. Provide a reason for each recommended schedule.

# Output Format
Provide the output in a strict JSON format. Do not add any text before or after the JSON block.
The JSON object must have two keys: "schedules" and "summary".
- "schedules": A list of objects, where each object has "title", "date" (YYYY-MM-DD), "start_time" (HH:MM), "end_time" (HH:MM), and "reason".
- "summary": A brief summary of the generated plan.

Example:
{{
  "schedules": [
    {{
      "title": "Project Planning",
      "date": "2025-11-20",
      "start_time": "19:30",
      "end_time": "21:30",
      "reason": "Evening is a preferred time, and this 2-hour block matches the focus duration."
    }}
  ],
  "summary": "Scheduled project planning for 2 hours in the evening to kickstart your goal."
}}
"""

def _format_schedules_for_prompt(schedules: List[models.Schedule]) -> str:
    """Helper function to format existing schedules for the prompt."""
    if not schedules:
        return "No existing schedules."
    return "\n".join([
        f"- {s.title} from {s.start_datetime.strftime('%Y-%m-%d %H:%M')} to {s.end_datetime.strftime('%Y-%m-%d %H:%M')}"
        for s in schedules
    ])

def _format_persona_for_prompt(persona: models.Persona) -> str:
    """Helper function to format the persona for the prompt."""
    location_info = f"\n- Location: {persona.location}" if persona.location else ""
    return f"""- Persona: {persona.persona_text}
- Preferred Times: {', '.join(persona.preferred_times or [])}
- Typical Focus Duration: {persona.focus_duration}{location_info}
"""

def _build_final_prompt(
    persona: models.Persona,
    schedules: List[models.Schedule],
    request: schemas.AIRecommendationRequest,
    holidays: str,
    weather: str
) -> str:
    """Builds the final prompt to be sent to the Gemini model for schedule recommendation."""
    persona_details = _format_persona_for_prompt(persona)
    existing_schedules_str = _format_schedules_for_prompt(schedules)

    return FINAL_RECOMMENDATION_PROMPT_TEMPLATE.format(
        persona_details=persona_details,
        holidays=holidays,
        weather=weather,
        existing_schedules=existing_schedules_str,
        user_prompt=request.prompt,
        start_date=request.start_date,
        end_date=request.end_date,
    )

def _format_schedule_history_for_prompt(schedules: List[models.Schedule]) -> str:
    """Helper function to format recent schedule history for the persona update prompt."""
    if not schedules:
        return "No schedules found in the last 30 days."
    return "\n".join([
        f"- Date: {s.start_datetime.strftime('%Y-%m-%d')}, Title: {s.title}, Completed: {'Yes' if s.is_completed else 'No'}"
        for s in schedules
    ])

def _build_persona_update_prompt(original_persona: models.Persona, schedule_history: List[models.Schedule]) -> str:
    """Builds the prompt for the persona update agent."""
    history_str = _format_schedule_history_for_prompt(schedule_history)
    original_persona_str = _format_persona_for_prompt(original_persona)

    return PERSONA_UPDATE_PROMPT_TEMPLATE.format(
        original_persona=original_persona_str,
        schedule_history=history_str
    )

# --------------------------------------------------------------------------
# 3. 에이전트의 도구 (Agent's Tools)
# --------------------------------------------------------------------------
def _get_user_persona(db: Session) -> models.Persona:
    """[Internal Tool] Retrieves the user's persona from the database."""
    print("Agent Action: Using 'get_user_persona' tool.")
    persona = crud.get_persona(db)
    if not persona:
        raise HTTPException(status_code=400, detail="Persona not set. Please create a persona first.")
    return persona

def _get_existing_schedules(db: Session, start_date: datetime, end_date: datetime) -> List[models.Schedule]:
    """[Internal Tool] Retrieves existing schedules within a date range."""
    print(f"Agent Action: Using 'get_existing_schedules' tool for {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}.")
    return crud.get_schedules_by_date_range(db, start_date, end_date)

def _execute_web_search(query: str) -> str:
    """Executes a web search using the Google Custom Search API."""
    if not GOOGLE_API_KEY or not CUSTOM_SEARCH_ENGINE_ID:
        return "Web search is not configured. GOOGLE_API_KEY or CUSTOM_SEARCH_ENGINE_ID is missing."
    try:
        service = build("customsearch", "v1", developerKey=GOOGLE_API_KEY)
        
        print(f"Web Search Query: {query}") # Added for debugging
        
        result = service.cse().list(q=query, cx=CUSTOM_SEARCH_ENGINE_ID, num=3).execute()
        
        if 'items' not in result:
            return "No relevant information found."
            
        snippets = [item.get('snippet', '') for item in result['items']]
        print(f"Web Search Raw Snippets: {snippets}") # Added for debugging
        return " ".join(snippets).replace('\n', ' ').strip()
        
    except HttpError as e:
        print(f"An HTTP error {e.resp.status} occurred during web search: {e.content}")
        return f"Web search failed with HTTP error: {e.resp.status}"
    except Exception as e:
        print(f"An unexpected error occurred during web search: {e}")
        return "An unexpected error occurred during web search."

def _search_public_holidays(location: str, start_date: datetime) -> str:
    """[Web Tool] Searches for public holidays in a given location for a specific year."""
    print(f"Agent Action: Using 'web_search' tool for public holidays in {location}.")
    year = start_date.year
    query = f"public holidays in {location} {year}"
    return _execute_web_search(query)

def _search_weather_forecast(location: str, start_date: datetime) -> str:
    """[Web Tool] Searches for a weather forecast for a specific date."""
    if (start_date - datetime.now()).days > 10:
        return "Weather forecast is only available for the near future (within 10 days)."
    
    print(f"Agent Action: Using 'web_search' tool for weather in {location}.")
    query = f"weather forecast for {location} on {start_date.strftime('%Y-%m-%d')}"
    return _execute_web_search(query)

# --------------------------------------------------------------------------
# 4. AI 에이전트 실행 (AI Agent Execution)
# --------------------------------------------------------------------------
def run_recommendation_agent(req: schemas.AIRecommendationRequest, db: Session) -> schemas.AIRecommendationResponse:
    """This function acts as the 'AI Schedule Recommendation Agent'."""
    print("AI Agent (Recommend): Starting recommendation process...")

    # 1. 내부 정보 수집 (Gather Internal Context)
    persona = _get_user_persona(db)
    try:
        start_dt = datetime.fromisoformat(req.start_date)
        end_dt = datetime.fromisoformat(req.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    
    existing_schedules = _get_existing_schedules(db, start_dt, end_dt)
    print("AI Agent (Recommend): Successfully gathered internal context (Persona and Schedules).")

    # 2. 외부 정보 수집 (Gather External Context using Web Tools)
    holidays = "Not available. User location not set."
    weather = "Not available. User location not set or not an outdoor activity."
    if persona.location:
        holidays = _search_public_holidays(persona.location, start_dt)
        print(f"Web Search Holidays Result: {holidays[:500]}...") # Added for debugging
        
        if any(keyword in req.prompt.lower() for keyword in OUTDOOR_KEYWORDS):
            weather = _search_weather_forecast(persona.location, start_dt)
            print(f"Web Search Weather Result: {weather[:500]}...") # Added for debugging

    print("AI Agent (Recommend): Successfully gathered external context (Holidays and Weather).")

    # 3. 최종 프롬프트 생성 (Build Final Prompt)
    prompt = _build_final_prompt(persona, existing_schedules, req, holidays, weather)
    print("AI Agent (Recommend): Constructed the final prompt for the LLM.")

    # 4. LLM 호출 (Call the LLM)
    if not gemini_api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")

    try:
        print("AI Agent (Recommend): Sending request to Gemini API...")
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        print("AI Agent (Recommend): Received response from Gemini API.")
        
        result = json.loads(cleaned_response_text)
        validated_result = schemas.AIRecommendationResponse(**result)
        print("AI Agent (Recommend): Successfully parsed and validated the AI response.")
        
        return validated_result

    except Exception as e:
        print(f"Error calling Gemini API or parsing response: {e}")
        raw_response = "No response"
        if 'response' in locals() and hasattr(response, 'text'):
            raw_response = response.text
        print(f"Raw response was: {raw_response}")
        raise HTTPException(status_code=500, detail=f"Failed to get recommendation from AI: {e}")


def run_persona_update_agent(db: Session) -> models.Persona:
    """This function acts as the 'AI Persona Update Agent'."""
    print("AI Agent (Persona): Starting persona update process...")

    # 1. 정보 수집 (Gather Information using Tools)
    persona = _get_user_persona(db)
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    schedule_history = _get_existing_schedules(db, start_date, end_date)
    print(f"AI Agent (Persona): Fetched {len(schedule_history)} schedules from the last 30 days.")

    # 2. 프롬프트 생성 (Build Prompt)
    prompt = _build_persona_update_prompt(persona, schedule_history)
    print("AI Agent (Persona): Constructed the persona update prompt for the LLM.")

    # 3. LLM 호출 (Call the LLM)
    if not gemini_api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
    
    try:
        print("AI Agent (Persona): Sending request to Gemini API...")
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        updated_persona_text = response.text.strip()
        print("AI Agent (Persona): Received updated persona text from Gemini API.")

        # 4. 페르소나 업데이트 (Update Persona)
        updated_persona_data = schemas.PersonaCreate(
            persona_text=updated_persona_text,
            preferred_times=persona.preferred_times,
            focus_duration=persona.focus_duration,
            location=persona.location
        )
        
        updated_persona = crud.create_or_update_persona(db, updated_persona_data)
        print("AI Agent (Persona): Successfully updated persona in the database.")

        return updated_persona

    except Exception as e:
        print(f"Error during persona update: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update persona using AI: {e}")