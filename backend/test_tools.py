from .database import init_db
from .tools import (
    suggest_exercise,
    log_session,
    get_session_history
)


init_db()

print("\n--- SUGGEST ---")
print(suggest_exercise("strength"))

print("\n--- LOG ---")
print(log_session("Barbell Squats"))

print("\n--- HISTORY ---")
print(get_session_history())
