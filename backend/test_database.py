from .database import init_db, add_session, get_sessions


init_db()

add_session(
    "Barbell Squats",
    "legs",
    "strength"
)

print(get_sessions())