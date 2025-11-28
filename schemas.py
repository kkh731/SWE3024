from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Persona Schemas
class PersonaBase(BaseModel):
    persona_text: str
    preferred_times: Optional[List[str]] = None
    focus_duration: Optional[str] = None
    location: Optional[str] = None # e.g., "Seoul, Korea"

class PersonaCreate(PersonaBase):
    pass

class Persona(PersonaBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Schedule Schemas
class ScheduleBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    is_completed: bool = False

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleBulkCreateItem(ScheduleBase):
    is_ai_generated: bool = True
    ai_reason: Optional[str] = None

# New input schema for bulk creation to match AI/client output
class ScheduleBulkCreateItemInput(BaseModel):
    title: str
    date: str # YYYY-MM-DD
    start_time: str # HH:MM
    end_time: str # HH:MM
    reason: Optional[str] = None

class ScheduleBulkCreate(BaseModel):
    schedules: List[ScheduleBulkCreateItemInput]


class Schedule(ScheduleBase):
    id: int
    is_ai_generated: bool
    ai_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# AI Recommendation Schemas
class AIRecommendationRequest(BaseModel):
    prompt: str
    start_date: str
    end_date: str

class AIRecommendationResponseSchedule(BaseModel):
    title: str
    date: str
    start_time: str
    end_time: str
    reason: str

class AIRecommendationResponse(BaseModel):
    schedules: List[AIRecommendationResponseSchedule]
    summary: str

# New schema for updating schedule status
class ScheduleStatusUpdate(BaseModel):
    is_completed: bool
