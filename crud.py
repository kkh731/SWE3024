from sqlalchemy.orm import Session
import models
import schemas
from datetime import datetime
from typing import List

# Persona CRUD
def get_persona(db: Session):
    # For simplicity, always get the first persona
    return db.query(models.Persona).first()

def create_or_update_persona(db: Session, persona: schemas.PersonaCreate):
    db_persona = get_persona(db)
    if db_persona:
        # Update existing persona
        db_persona.persona_text = persona.persona_text
        db_persona.preferred_times = persona.preferred_times
        db_persona.focus_duration = persona.focus_duration
        db_persona.location = persona.location
        db_persona.updated_at = datetime.utcnow()
    else:
        # Create new persona
        db_persona = models.Persona(**persona.dict())
        db.add(db_persona)
    db.commit()
    db.refresh(db_persona)
    return db_persona

# Schedule CRUD
def get_schedules_by_date_range(db: Session, start_date: datetime, end_date: datetime):
    return db.query(models.Schedule).filter(
        models.Schedule.start_datetime >= start_date,
        models.Schedule.end_datetime <= end_date
    ).order_by(models.Schedule.start_datetime).all()

def create_schedule(db: Session, schedule: schemas.ScheduleCreate):
    db_schedule = models.Schedule(**schedule.dict())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def bulk_create_schedules(db: Session, schedules: List[schemas.ScheduleBulkCreateItem]):
    db_schedules = [models.Schedule(**s.dict()) for s in schedules]
    db.add_all(db_schedules)
    db.commit()
    # We can't easily refresh all, so we return the input data
    return db_schedules

def get_schedule(db: Session, schedule_id: int):
    return db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()

def update_schedule(db: Session, schedule_id: int, schedule: schemas.ScheduleCreate):
    db_schedule = get_schedule(db, schedule_id)
    if db_schedule:
        for key, value in schedule.dict().items():
            setattr(db_schedule, key, value)
        db.commit()
        db.refresh(db_schedule)
    return db_schedule

def delete_schedule(db: Session, schedule_id: int):
    db_schedule = get_schedule(db, schedule_id)
    if db_schedule:
        db.delete(db_schedule)
        db.commit()
    return db_schedule

def update_schedule_status(db: Session, schedule_id: int, is_completed: bool):
    db_schedule = get_schedule(db, schedule_id)
    if db_schedule:
        db_schedule.is_completed = is_completed
        db.commit()
        db.refresh(db_schedule)
    return db_schedule
