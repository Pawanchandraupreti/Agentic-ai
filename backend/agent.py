import json
import os

from dotenv import load_dotenv
from openai import OpenAI

from .tools import (
    suggest_exercise,
    log_session,
    get_session_history,
    get_all_exercises
)


load_dotenv()


PROVIDER = os.getenv(
    "PROVIDER",
    "foundry"
)

AZURE_OPENAI_ENDPOINT = os.getenv(
    "AZURE_OPENAI_ENDPOINT"
)

AZURE_OPENAI_API_KEY = os.getenv(
    "AZURE_OPENAI_API_KEY"
)

MODEL = os.getenv(
    "MODEL",
    "chat-demo"
)


if not AZURE_OPENAI_ENDPOINT:
    raise ValueError(
        "AZURE_OPENAI_ENDPOINT is missing from .env"
    )


if not AZURE_OPENAI_API_KEY:
    raise ValueError(
        "AZURE_OPENAI_API_KEY is missing from .env"
    )


client = OpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    base_url=AZURE_OPENAI_ENDPOINT.rstrip("/") + "/"
)


SUPPORTED_EXERCISES = get_all_exercises()


SYSTEM = f"""
You are FitAgent, an intelligent workout planning assistant.

Your job is to help users plan, complete, and track workouts.

You have access to these tools:

1. suggest_exercise
   Use this when the user wants a workout recommendation.
   This tool considers the user's recent stored workout history.

2. log_session
   Use this when the user says they completed an exercise.

3. get_session_history
   Use this when the user asks about previous workouts,
   workout history, or progress.

MEMORY RULES:

- Workout history is permanently stored in the database.
- Do not invent previous workouts.
- Do not assume a workout was completed unless it was logged
  or the user explicitly confirms completion.
- When previous workout information is relevant, use
  get_session_history.
- When recommending the next exercise, always use
  suggest_exercise.
- The database is the source of truth for completed workouts.

RECOMMENDATION RULES:

- Always use suggest_exercise when deciding what exercise
  the user should do next.
- Do not create a fixed weekly schedule.
- If the user specifies strength, cardio, or flexibility,
  use that goal.
- If the user asks generally what they should train today,
  choose a sensible workout goal and use suggest_exercise.
- Consider the user's recent workout history through the tool.
- NEVER invent an exercise outside the supported exercise list.
- Only recommend exercises that can be logged by log_session.

SUPPORTED EXERCISES:

{", ".join(SUPPORTED_EXERCISES)}

COMPLETION RULES:

When the user confirms that they completed an exercise,
use log_session.

Examples of completion messages:

"I completed it"
"I did it"
"done"
"finished"
"I finished my workout"
"I just completed that"
"I completed the workout"
"done next"
"finished that"

If the user says "it", "that", "the workout", or similar,
use the previously recommended exercise from the conversation
as the completed exercise.

When calling log_session, provide only the exercise name.

IMPORTANT:

If the previously recommended exercise was "Deadlift",
call log_session with:

Deadlift

If the previously recommended exercise was "Deadlifts",
normalize it to:

Deadlift

Never send an unsupported exercise name to log_session.

HISTORY RULES:

When the user asks questions such as:

"What workouts have I done?"
"Show my workout history"
"What did I train recently?"
"What did I do yesterday?"
"Show my progress"
"How many workouts have I completed?"

use get_session_history.

Use the returned database information to answer the user.

GENERAL CONVERSATION:

If the user asks how to perform an exercise, explain:

- Starting position
- Grip or stance
- Movement
- Breathing
- Common mistakes
- Beginner-friendly guidance

If the user asks how many reps or sets to do,
give a reasonable general recommendation.

Do not claim to know the user's exact physical ability.

Be friendly, concise, and encouraging.

You provide general fitness guidance, not medical advice.
"""


TOOL_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "suggest_exercise",
            "description": (
                "Suggest the next exercise based on a workout goal "
                "and the user's recent stored workout history."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "goal": {
                        "type": "string",
                        "enum": [
                            "strength",
                            "cardio",
                            "flexibility"
                        ],
                        "description": (
                            "The user's workout goal."
                        )
                    }
                },
                "required": ["goal"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "log_session",
            "description": (
                "Record that the user completed an exercise. "
                "Only supported exercises can be logged."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "exercise": {
                        "type": "string",
                        "enum": SUPPORTED_EXERCISES,
                        "description": (
                            "The exact supported exercise "
                            "completed by the user."
                        )
                    }
                },
                "required": ["exercise"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_session_history",
            "description": (
                "Return the user's stored workout history. "
                "Use this when the user asks about previous "
                "workouts or progress."
            ),
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]


REGISTRY = {
    "suggest_exercise": suggest_exercise,
    "log_session": log_session,
    "get_session_history": get_session_history
}


def run_agent(
    user_message: str,
    conversation=None,
    max_steps: int = 6
) -> str:

    messages = [
        {
            "role": "system",
            "content": SYSTEM
        }
    ]

    if conversation:

        for item in conversation:

            role = item.get("role")
            content = item.get("content")

            if role in [
                "user",
                "assistant"
            ] and content:

                messages.append({
                    "role": role,
                    "content": content
                })

    messages.append({
        "role": "user",
        "content": user_message
    })

    for step in range(max_steps):

        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOL_SCHEMA
        )

        message = response.choices[0].message

        messages.append(
            message.model_dump(
                exclude_none=True
            )
        )

        if not message.tool_calls:

            return message.content or ""

        for call in message.tool_calls:

            name = call.function.name

            try:

                args = json.loads(
                    call.function.arguments or "{}"
                )

            except json.JSONDecodeError:

                result = {
                    "error": "Invalid tool arguments."
                }

                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": json.dumps(
                        result
                    )
                })

                continue

            if name in REGISTRY:

                try:

                    result = REGISTRY[name](
                        **args
                    )

                except Exception as e:

                    result = {
                        "error": str(e)
                    }

            else:

                result = {
                    "error": (
                        f"Unknown tool '{name}'. "
                        f"Available tools: "
                        f"{list(REGISTRY)}"
                    )
                }

            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": json.dumps(
                    result,
                    default=str
                )
            })

    return (
        f"Stopped after {max_steps} steps "
        "without reaching a final answer."
    )