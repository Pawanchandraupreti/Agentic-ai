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
        ("Shoulder Press", "shoulders"),
        ("Deadlift", "back"),
        ("Barbell Rows", "back"),
        ("Lunges", "legs"),
        ("Bicep Curls", "biceps"),
        ("Tricep Dips", "triceps")
    ],
    "cardio": [
        ("Running", "cardio"),
        ("Cycling", "cardio"),
        ("Jump Rope", "cardio"),
        ("Burpees", "cardio"),
        ("Mountain Climbers", "cardio")
    ],
    "flexibility": [
        ("Hamstring Stretch", "hamstrings"),
        ("Hip Flexor Stretch", "hips"),
        ("Shoulder Stretch", "shoulders"),
        ("Quad Stretch", "legs"),
        ("Calf Stretch", "calves")
    ]
}


EXERCISE_ALIASES = {
    "deadlifts": "Deadlift",
    "deadlift": "Deadlift",

    "squats": "Barbell Squats",
    "barbell squat": "Barbell Squats",
    "barbell squats": "Barbell Squats",

    "benchpress": "Bench Press",
    "bench press": "Bench Press",

    "pullups": "Pull Ups",
    "pull ups": "Pull Ups",
    "pull-up": "Pull Ups",
    "pull-ups": "Pull Ups",

    "shoulder press": "Shoulder Press",
    "shoulder presses": "Shoulder Press",

    "barbell row": "Barbell Rows",
    "barbell rows": "Barbell Rows",

    "lunges": "Lunges",
    "lunge": "Lunges",

    "bicep curl": "Bicep Curls",
    "bicep curls": "Bicep Curls",

    "tricep dip": "Tricep Dips",
    "tricep dips": "Tricep Dips",

    "running": "Running",
    "run": "Running",

    "cycling": "Cycling",
    "cycle": "Cycling",

    "jump rope": "Jump Rope",
    "jump ropes": "Jump Rope",

    "burpee": "Burpees",
    "burpees": "Burpees",

    "mountain climber": "Mountain Climbers",
    "mountain climbers": "Mountain Climbers",

    "hamstring stretch": "Hamstring Stretch",
    "hamstring stretches": "Hamstring Stretch",

    "hip flexor stretch": "Hip Flexor Stretch",
    "hip flexor stretches": "Hip Flexor Stretch",

    "shoulder stretch": "Shoulder Stretch",
    "shoulder stretches": "Shoulder Stretch",

    "quad stretch": "Quad Stretch",
    "quad stretches": "Quad Stretch",

    "calf stretch": "Calf Stretch",
    "calf stretches": "Calf Stretch"
}


def normalize_exercise_name(exercise: str):
    if not exercise:
        return None

    cleaned = " ".join(
        exercise.strip().lower().split()
    )

    if cleaned in EXERCISE_ALIASES:
        return EXERCISE_ALIASES[cleaned]

    for exercises in EXERCISES.values():
        for name, _ in exercises:
            if name.lower() == cleaned:
                return name

    return None


def suggest_exercise(goal: str):
    sessions = get_sessions()

    recent_exercises = {
        session["exercise"].lower()
        for session in sessions[:3]
    }

    recent_muscles = {
        session["muscle_group"]
        for session in sessions[:3]
        if session["muscle_group"]
    }

    exercises = EXERCISES.get(
        goal.lower(),
        []
    )

    for exercise, muscle_group in exercises:

        if (
            exercise.lower() not in recent_exercises
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

    normalized_name = normalize_exercise_name(
        exercise
    )

    if not normalized_name:
        return {
            "error": (
                f"Unknown exercise: {exercise}. "
                f"Supported exercises are: "
                f"{', '.join(get_all_exercises())}"
            )
        }

    for goal, exercises in EXERCISES.items():

        for name, muscle_group in exercises:

            if name == normalized_name:

                session_id = add_session(
                    name,
                    muscle_group,
                    goal
                )

                return {
                    "success": True,
                    "id": session_id,
                    "exercise": name,
                    "muscle_group": muscle_group,
                    "goal": goal
                }

    return {
        "error": f"Unknown exercise: {exercise}"
    }


def get_all_exercises():

    exercises = []

    for exercise_list in EXERCISES.values():

        for name, _ in exercise_list:

            exercises.append(name)

    return exercises


def get_session_history():
    return get_sessions()


def reset_history():
    reset_sessions()

    return {
        "success": True,
        "message": "Workout history reset."
    }