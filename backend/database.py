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
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id)
                REFERENCES chat_sessions(id)
        )
    """)

    connection.commit()
    connection.close()


# =========================
# WORKOUT HISTORY
# =========================

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
        SELECT
            id,
            exercise,
            muscle_group,
            goal,
            created_at
        FROM sessions
        ORDER BY created_at DESC
        """
    ).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def reset_sessions():
    connection = get_connection()

    connection.execute(
        "DELETE FROM sessions"
    )

    connection.commit()
    connection.close()


# =========================
# CHAT SESSIONS
# =========================

def create_chat_session(session_id, title="New Workout Chat"):
    connection = get_connection()

    connection.execute(
        """
        INSERT OR IGNORE INTO chat_sessions
        (id, title)
        VALUES (?, ?)
        """,
        (session_id, title)
    )

    connection.commit()
    connection.close()


def get_chat_sessions():
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT
            id,
            title,
            created_at,
            updated_at
        FROM chat_sessions
        ORDER BY updated_at DESC
        """
    ).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def update_chat_title(session_id, title):
    connection = get_connection()

    connection.execute(
        """
        UPDATE chat_sessions
        SET
            title = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (title, session_id)
    )

    connection.commit()
    connection.close()


def update_chat_session(session_id):
    connection = get_connection()

    connection.execute(
        """
        UPDATE chat_sessions
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (session_id,)
    )

    connection.commit()
    connection.close()


def delete_chat_session(session_id):
    connection = get_connection()

    connection.execute(
        """
        DELETE FROM memories
        WHERE session_id = ?
        """,
        (session_id,)
    )

    connection.execute(
        """
        DELETE FROM chat_sessions
        WHERE id = ?
        """,
        (session_id,)
    )

    connection.commit()
    connection.close()


def reset_all_chat_sessions():
    connection = get_connection()

    connection.execute(
        "DELETE FROM memories"
    )

    connection.execute(
        "DELETE FROM chat_sessions"
    )

    connection.commit()
    connection.close()


# =========================
# CHAT MEMORY
# =========================

def save_memory(session_id, role, content):
    connection = get_connection()

    connection.execute(
        """
        INSERT INTO memories
        (session_id, role, content)
        VALUES (?, ?, ?)
        """,
        (
            session_id,
            role,
            content
        )
    )

    connection.execute(
        """
        UPDATE chat_sessions
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (session_id,)
    )

    connection.commit()
    connection.close()


def get_memory(session_id, limit=100):
    connection = get_connection()

    rows = connection.execute(
        """
        SELECT
            role,
            content,
            created_at
        FROM memories
        WHERE session_id = ?
        ORDER BY id ASC
        LIMIT ?
        """,
        (
            session_id,
            limit
        )
    ).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def reset_memory(session_id):
    connection = get_connection()

    connection.execute(
        """
        DELETE FROM memories
        WHERE session_id = ?
        """,
        (session_id,)
    )

    connection.execute(
        """
        UPDATE chat_sessions
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (session_id,)
    )

    connection.commit()
    connection.close()