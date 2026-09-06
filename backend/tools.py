from .database import (
    add_session,
    get_sessions,
    reset_sessions
)


EXERCISES = {
    "strength": [
        ("Barbell Squats", "legs"),
        ("Bench Press", "chest"),
        ("Pull Ups", "back"),
        ("Shoulder Press", "shoulders")
    ],
    "cardio": [
        ("Running", "cardio"),
        ("Cycling", "cardio"),
        ("Jump Rope", "cardio")
    ],
    "flexibility": [
        ("Hamstring Stretch", "hamstrings"),
        ("Hip Flexor Stretch", "hips"),
        ("Shoulder Stretch", "shoulders")
    ]
}


def suggest_exercise(goal: str):
    sessions = get_sessions()

    recent_exercises = {
        session["exercise"]
        for session in sessions[:3]
    }

    recent_muscles = {
        session["muscle_group"]
        for session in sessions[:3]
    }

    exercises = EXERCISES.get(goal, [])

    for exercise, muscle_group in exercises:
        if (
            exercise not in recent_exercises
            and muscle_group not in recent_muscles
        ):
            return {
                "exercise": exercise,
                "muscle_group": muscle_group,
                "goal": goal
            }

    if exercises:
        exercise, muscle_group = exercises[0]

        return {
            "exercise": exercise,
            "muscle_group": muscle_group,
            "goal": goal
        }

    return {
        "error": f"Unknown workout goal: {goal}"
    }


def log_session(exercise: str):
    exercise_data = None
    exercise_goal = None

    for goal, exercises in EXERCISES.items():
        for name, muscle_group in exercises:

            if name.lower() == exercise.lower():
                exercise_data = (
                    name,
                    muscle_group
                )
                exercise_goal = goal
                break

        if exercise_data:
            break

    if not exercise_data:
        return {
            "error": f"Unknown exercise: {exercise}"
        }

    name, muscle_group = exercise_data

    session_id = add_session(
        name,
        muscle_group,
        exercise_goal
    )

    return {
        "success": True,
        "id": session_id,
        "exercise": name,
        "muscle_group": muscle_group,
        "goal": exercise_goal
    }


def get_session_history():
    return get_sessions()


def reset_history():
    reset_sessions()

    return {
        "success": True,
        "message": "Workout history reset."
    }