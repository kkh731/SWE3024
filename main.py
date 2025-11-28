import os
from fastapi import FastAPI, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware # Added import

import crud
import models
import schemas
from database import SessionLocal, engine, get_db
import ai_engine  # Import the new AI engine

# Create database tables
models.Base.metadata.create_all(bind=engine)

def seed_initial_data():
    """
    Checks if the database is empty and, if so, seeds it with initial data.
    """
    db = SessionLocal()
    try:
        # Check if a persona already exists
        if db.query(models.Persona).count() == 0:
            print("No persona found. Seeding database with default persona.")
            default_persona = schemas.PersonaCreate(
                persona_text="A diligent office worker who wants to balance a healthy lifestyle with professional development. Tries to exercise in the evening and study new skills in the morning.",
                preferred_times=["morning", "evening"],
                focus_duration="1hour",
                location="Seoul, Korea"
            )
            crud.create_or_update_persona(db=db, persona=default_persona)
            print("Default persona seeded.")
        else:
            print("Persona already exists. Skipping seeding.")
    finally:
        db.close()

# Seed the database at startup
seed_initial_data()


app = FastAPI(
    title="AI Scheduler API",
    description="AI 스케줄 추천 및 관리 백엔드 API",
    version="1.0.0"
)

# Added CORSMiddleware
origins = [
    "http://localhost:5173",  # Frontend development server
    # You can add other origins here if needed, e.g., "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Persona Endpoints ---
@app.post("/api/persona", response_model=schemas.Persona, summary="페르소나 생성 또는 업데이트")
def create_or_update_persona_endpoint(
    persona: schemas.PersonaCreate = Body(
        ...,
        example={
            "persona_text": "A night owl software developer looking to learn a new language on weekends.",
            "preferred_times": ["evening", "night"],
            "focus_duration": "2hour+",
            "location": "Seoul, Korea"
        },
    ),
    db: Session = Depends(get_db)
):
    """
    사용자의 페르소나를 생성하거나 업데이트합니다.
    시스템에 페르소나가 없으면 새로 생성하고, 있으면 기존 정보를 업데이트합니다.
    """
    return crud.create_or_update_persona(db=db, persona=persona)

@app.get("/api/persona", response_model=schemas.Persona, summary="페르소나 조회")
def read_persona_endpoint(db: Session = Depends(get_db)):
    """
    현재 설정된 사용자의 페르소나 정보를 조회합니다.
    """
    db_persona = crud.get_persona(db)
    if db_persona is None:
        raise HTTPException(status_code=404, detail="Persona not found")
    return db_persona

@app.post("/api/persona/update-from-history", response_model=schemas.Persona, summary="일정 기록 기반 페르소나 자동 업데이트")
def update_persona_from_history_endpoint(db: Session = Depends(get_db)):
    """
    최근 일정 기록을 분석하여 AI가 페르소나를 자동으로 업데이트합니다.
    """
    return ai_engine.run_persona_update_agent(db=db)



# --- Schedule Endpoints ---
@app.post("/api/schedules", response_model=schemas.Schedule, summary="일정 생성")
def create_schedule_endpoint(
    schedule: schemas.ScheduleCreate = Body(
        ...,
        example={
            "title": "Weekly project sync",
            "description": "Discuss progress on the AI scheduler project.",
            "start_datetime": "2025-11-28T10:00:00",
            "end_datetime": "2025-11-28T11:00:00",
            "is_completed": False
        }
    ),
    db: Session = Depends(get_db)
):
    """
    새로운 일정을 생성합니다.
    """
    return crud.create_schedule(db=db, schedule=schedule)

@app.post("/api/schedules/bulk-create", response_model=List[schemas.Schedule], summary="AI 추천 일정 대량 생성")
def bulk_create_schedules_endpoint(
    payload: schemas.ScheduleBulkCreate = Body(
        ...,
        example={
            "schedules": [
                {
                    "title": "Review AI Agent architecture",
                    "date": "2025-11-28",
                    "start_time": "14:00",
                    "end_time": "15:00",
                    "reason": "AI-suggested task based on user's goal to improve the project."
                },
                {
                    "title": "Code refactoring session",
                    "date": "2025-11-29",
                    "start_time": "10:00",
                    "end_time": "12:00",
                    "reason": "AI-suggested task for code quality improvement."
                }
            ]
        }
    ),
    db: Session = Depends(get_db)
):
    """
    AI가 추천한 여러 개의 일정을 한 번에 데이터베이스에 추가합니다.
    """
    schedules_to_create = []
    for s in payload.schedules:
        try:
            start_dt_str = f"{s.date} {s.start_time}"
            end_dt_str = f"{s.date} {s.end_time}"
            start_datetime = datetime.fromisoformat(start_dt_str)
            end_datetime = datetime.fromisoformat(end_dt_str)
            
            schedule_item = schemas.ScheduleBulkCreateItem(
                title=s.title,
                start_datetime=start_datetime,
                end_datetime=end_datetime,
                is_ai_generated=True,
                ai_reason=s.reason
            )
            schedules_to_create.append(schedule_item)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error parsing schedule data: {e}")

    return crud.bulk_create_schedules(db=db, schedules=schedules_to_create)


@app.get("/api/schedules", response_model=List[schemas.Schedule], summary="특정 기간 일정 조회")
def read_schedules_endpoint(start_date: datetime, end_date: datetime, db: Session = Depends(get_db)):
    """
    지정된 시작일과 종료일 사이의 모든 일정을 조회합니다.
    """
    return crud.get_schedules_by_date_range(db=db, start_date=start_date, end_date=end_date)

@app.put("/api/schedules/{schedule_id}", response_model=schemas.Schedule, summary="일정 수정")
def update_schedule_endpoint(
    schedule_id: int,
    schedule: schemas.ScheduleCreate = Body(
        ...,
        example={
            "title": "Weekly project sync (Rescheduled)",
            "description": "Discuss progress on the AI scheduler project and new architecture.",
            "start_datetime": "2025-11-28T10:30:00",
            "end_datetime": "2025-11-28T11:30:00",
            "is_completed": False
        }
    ),
    db: Session = Depends(get_db)
):
    """
    특정 ID를 가진 일정을 수정합니다.
    """
    db_schedule = crud.update_schedule(db=db, schedule_id=schedule_id, schedule=schedule)
    if db_schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return db_schedule

@app.put("/api/schedules/{schedule_id}/status", response_model=schemas.Schedule, summary="일정 완료 상태 변경")
def update_schedule_status_endpoint(
    schedule_id: int,
    status: schemas.ScheduleStatusUpdate = Body(
        ...,
        example={"is_completed": True}
    ),
    db: Session = Depends(get_db)
):
    """일정의 완료 여부를 업데이트합니다."""
    db_schedule = crud.update_schedule_status(db=db, schedule_id=schedule_id, is_completed=status.is_completed)
    if db_schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return db_schedule

@app.delete("/api/schedules/{schedule_id}", response_model=schemas.Schedule, summary="일정 삭제")
def delete_schedule_endpoint(schedule_id: int, db: Session = Depends(get_db)):
    """
    특정 ID를 가진 일정을 삭제합니다.
    """
    db_schedule = crud.delete_schedule(db=db, schedule_id=schedule_id)
    if db_schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return db_schedule


# --- AI Recommendation Endpoint ---
@app.post("/api/schedules/recommend", response_model=schemas.AIRecommendationResponse, summary="AI 일정 추천")
def recommend_schedules_endpoint(
    req: schemas.AIRecommendationRequest = Body(
        ...,
        example={
            "prompt": "I want to start jogging for 30 minutes three times a week to improve my health. Find some good times for me next week.",
            "start_date": "2025-12-01",
            "end_date": "2025-12-07"
        }
    ),
    db: Session = Depends(get_db)
):
    """
    사용자의 프롬프트, 페르소나, 기존 일정을 바탕으로 AI에게 새로운 일정을 추천받습니다.
    AI 엔진이 이 모든 과정을 담당합니다.
    """
    return ai_engine.run_recommendation_agent(req=req, db=db)

# Root endpoint for health check
@app.get("/", summary="API Health Check")
def read_root():
    return {"status": "ok", "message": "Welcome to the AI Scheduler API!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
