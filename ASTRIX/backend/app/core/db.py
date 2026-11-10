import os
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Postgres: ******localhost:5432/emergency
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./emergency.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 15}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Enable WAL mode and normal synchronous writing for SQLite to prevent concurrency lockouts
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

    def ensure_sqlite_schema():
        with engine.begin() as conn:
            inspector = inspect(conn)
            if not inspector.has_table("incidents"):
                return

            columns = {col["name"] for col in inspector.get_columns("incidents")}
            missing = []
            if "report_count" not in columns:
                missing.append("report_count INTEGER NOT NULL DEFAULT 1")

            for column_sql in missing:
                conn.execute(text(f"ALTER TABLE incidents ADD COLUMN {column_sql}"))

else:
    def ensure_sqlite_schema():
        return

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
