# FitAgent Workout Planner

FitAgent is an agentic workout-planning application that combines a FastAPI
backend, a React/Vite frontend, SQLite persistence, and an OpenAI-compatible
model endpoint. The application helps a user choose the next workout from
recent training history, record completed sessions, review progress, and
continue conversations with an AI coach.

The current web experience includes a dashboard, AI Coach chat, saved chat
history, Workout History, and a Progress view. Chat conversations are stored
in SQLite, so a conversation remains available after a page refresh. Completed
workouts are also stored in SQLite and are supplied to the agent as the source
of truth for recommendations and progress summaries.

## Features

- **AI Coach chat**
  - Ask for a strength, cardio, or flexibility recommendation.
  - Ask how to perform an exercise or how to structure sets and reps.
  - Ask about previous workouts and progress.
  - Confirm a completed exercise in natural language and let the agent log it.
- **Saved chat history**
  - Create multiple conversations.
  - Automatically save user and assistant messages.
  - Reopen previous conversations from the sidebar.
  - Rename chats after the first message.
  - Clear one conversation, delete a conversation, or delete all conversations.
- **Workout tracking**
  - Store exercise name, muscle group, goal, and completion timestamp.
  - Review all completed workouts in the Workout History page.
  - Reset workout history when starting over.
- **Adaptive recommendations**
  - Avoid recently trained exercises and muscle groups where possible.
  - Use recent stored sessions rather than a fixed weekly calendar.
  - Progress prescriptions after repeated sessions for the same goal.
- **Progress dashboard**
  - Show total completed workouts.
  - Show workouts completed during the current week.
  - Show the latest completed workout.

## Project structure

```text
.
├── backend/
│   ├── agent.py          # Model client, system instructions, and tool loop
│   ├── database.py       # SQLite schema and persistence helpers
│   ├── main.py           # FastAPI application and HTTP routes
│   ├── tools.py          # Recommendation and workout logging tools
│   ├── requirements.txt  # Backend dependencies
│   └── test_*.py         # Backend tests
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main React UI and application state
│   │   ├── App.css       # Application styles
│   │   └── main.jsx      # React entry point
│   ├── package.json      # Frontend scripts and dependencies
│   └── vite.config.js    # Vite configuration
├── notebook/             # Exploratory/project notebook material
├── workout.db            # Local SQLite database, created/used at runtime
├── .env                 # Local secrets and model configuration (do not commit)
└── README.md
```

## Requirements

- Windows, macOS, or Linux
- Python 3.10 or newer
- Node.js and npm
- An OpenAI-compatible chat model endpoint
- A model API key and model/deployment name

The backend currently expects an Azure Foundry-compatible configuration:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `MODEL`
- Optional: `PROVIDER`

The exact values belong in a local `.env` file and must never be committed or
shared publicly. If your provider uses a different configuration, update the
client configuration in `backend/agent.py` consistently with that provider.

## Run locally on Windows

Open PowerShell in the repository root:

```powershell
cd "C:\Users\<your-user>\Desktop\abcd\workout-planner-agent"
```

### 1. Create or activate the Python environment

If the repository already contains `.venv`, activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

If it does not exist, create it first:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```powershell
pip install -r backend\requirements.txt
```

### 2. Configure the model endpoint

Create `.env` in the repository root if it does not already exist. Add the
required endpoint, key, and model settings. Do not paste API keys into source
files, commit them, or include them in bug reports.

### 3. Start the backend

From the repository root:

```powershell
.\.venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000
```

Verify it is healthy:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
```

The response should contain:

```json
{"status":"healthy"}
```

### 4. Start the frontend

Open a second PowerShell window:

```powershell
cd "C:\Users\<your-user>\Desktop\abcd\workout-planner-agent\frontend"
npm install
npm run dev -- --host localhost
```

Open the URL printed by Vite, normally:

```text
http://localhost:5173
```

The frontend defaults to `http://127.0.0.1:8000` for the API. If the backend
uses another port, create `frontend\.env` with:

```text
VITE_API_URL=http://127.0.0.1:8001
```

Restart Vite after changing this value. The backend CORS allow-list must also
include the frontend origin if you use a non-standard host or port.

## API routes

### Service and workout routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | Basic service status |
| GET | `/health` | Health check |
| GET | `/history` | Return completed workout history |
| POST | `/reset` | Delete completed workout history |

### Chat routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/chat` | Send a message to the AI coach |
| POST | `/chats` | Create a chat session |
| GET | `/chats` | List saved chat sessions |
| GET | `/chats/{session_id}` | Load one conversation |
| PUT | `/chats/{session_id}` | Rename a conversation |
| DELETE | `/chats/{session_id}` | Delete a conversation and its messages |
| POST | `/chats/{session_id}/reset` | Clear messages in one conversation |
| POST | `/chats/reset/all` | Delete all conversations |

Example chat request:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/chat `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"session_id":"local-demo","message":"What should I train today?"}'
```

The chat endpoint loads the saved conversation, sends it to the model with the
agent instructions and available tools, then stores both the new user message
and assistant response in SQLite.

## Agent behavior

The model can call three backend tools:

1. `suggest_exercise(goal)` selects a supported exercise while considering
   recent sessions.
2. `log_session(exercise)` validates and permanently records a completed
   exercise.
3. `get_session_history()` returns stored workout history for progress
   questions.

The model is instructed not to invent completed workouts and not to recommend
unsupported exercises. Workout history is server-side context and database
state; it is not trusted as an unverified client-side claim.

## Data persistence

The default database is `workout.db` in the repository root. On startup,
`backend/database.py` creates these tables if they do not already exist:

- `sessions` — completed exercises and their metadata.
- `chat_sessions` — saved conversation titles and timestamps.
- `memories` — ordered user and assistant messages for each conversation.

The database is local and intentionally simple for development. Back it up
before manually editing or deleting it. For a production deployment, use a
managed database, authenticated users, secret management, migrations, and
appropriate access controls.

## Testing and quality checks

Run the backend tests from the repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest backend
```

Run the frontend lint and production build:

```powershell
cd frontend
npm run lint
npm run build
```

For a quick manual smoke test:

1. Start the backend and confirm `/health`.
2. Open the frontend at the Vite URL.
3. Open **AI Coach** and send a recommendation request.
4. Confirm the response appears in the conversation.
5. Confirm the chat appears in the sidebar after refresh.
6. Tell the coach that the recommended exercise is complete.
7. Confirm the logged workout appears in **Workout History** and updates the
   dashboard totals.

## Troubleshooting

### “Connection error” in chat

Confirm that the frontend API URL points to the backend that is actually
running. The normal pairing is frontend `http://localhost:5173` with backend
`http://127.0.0.1:8000`. If another copy of the project is running, it may
occupy the same ports or serve a different UI.

Check the backend directly:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
```

If the health check fails, start the backend again. If health succeeds but the
browser reports CORS errors, use the frontend URL allowed by
`backend/main.py`, or add your development origin to its CORS configuration.

### PowerShell blocks `npm`

On some Windows installations, PowerShell blocks the `npm.ps1` script. Use
`npm.cmd` instead:

```powershell
npm.cmd install
npm.cmd run dev
```

### Model configuration errors

If the backend reports that `AZURE_OPENAI_ENDPOINT` or
`AZURE_OPENAI_API_KEY` is missing, check the root `.env` file and restart
Uvicorn. Keep the values private and do not put quotes, whitespace, or
credentials into committed documentation.

## Honest failure and how it was handled

One failure during local verification was a browser “connection error” while
chatting. The browser was open on a different copy of the project running on
another Vite port, while the API URL and CORS configuration belonged to the
checked-out copy, so the request was blocked even though one backend health
check was passing.

I handled it by inspecting the running process command lines and listening
ports instead of assuming that the visible page came from the current
repository. I identified the duplicate frontend and backend processes,
started the checked-out backend on port 8000, and verified the chat and
history routes directly.

Finally, I closed the unused browser pages and stopped the duplicate frontend
processes, then reopened the matching app at `http://localhost:5173`. The
important lesson is that a healthy API alone does not prove the browser is
connected to the correct application copy; the frontend origin, API URL, CORS
allow-list, and process working directory must be checked together.

## Security notes

- Never commit `.env`, API keys, database credentials, or model tokens.
- Do not expose the development Uvicorn server directly to the public internet.
- Add authentication and per-user data isolation before hosting this for
  multiple users.
- Treat the workout assistant as general fitness guidance, not medical advice.
- Validate and constrain model tool calls on the server, as this project does
  for supported exercise logging.

## License

See [LICENSE](LICENSE) for the project license.
