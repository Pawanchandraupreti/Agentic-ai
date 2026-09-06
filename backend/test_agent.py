from .agent import run_agent
from .tools import reset_history, get_session_history


reset_history()

print("\n--- TEST 1 ---")

response = run_agent(
    "I want a strength workout today."
)

print(response)


print("\n--- TEST 2 ---")

response = run_agent(
    "I just finished the Barbell Squats. Log it."
)

print(response)


print("\n--- TEST 3 ---")

response = run_agent(
    "Give me another strength workout."
)

print(response)


print("\n--- HISTORY ---")

print(get_session_history())