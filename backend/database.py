import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).resolve().parent.parent / "workout.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exercise TEXT NOT NULL,
            muscle_group TEXT,
            goal TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.commit()
    connection.close()


def add_session(exercise, muscle_group=None, goal=None):
    connection = get_connection()

    cursor = connection.execute(
        """
        INSERT INTO sessions
        (exercise, muscle_group, goal)
        VALUES (?, ?, ?)
        """,
        (exercise, muscle_group, goal)
    )

    connection.commit()
    session_id = cursor.lastrowid
    connection.close()

    return session_id


def get_sessions():
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT id, exercise, muscle_group, goal, created_at
        FROM sessions
        ORDER BY created_at DESC
        """
    ).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def reset_sessions():
    connection = get_connection()

    connection.execute("DELETE FROM sessions")

    connection.commit()
    connection.close()


def save_memory(session_id, role, content):
    connection = get_connection()

    connection.execute(
        """
        INSERT INTO memories
        (session_id, role, content)
        VALUES (?, ?, ?)
        """,
        (session_id, role, content)
    )

    connection.commit()
    connection.close()


def get_memory(session_id, limit=20):
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT role, content, created_at
        FROM memories
        WHERE session_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (session_id, limit)
    ).fetchall()

    connection.close()

    return [dict(row) for row in reversed(rows)]


def reset_memory(session_id):
    connection = get_connection()

    connection.execute(
        "DELETE FROM memories WHERE session_id = ?",
        (session_id,)
    )

    connection.commit()
    connection.close()