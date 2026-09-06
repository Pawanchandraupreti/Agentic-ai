import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  CalendarDays,
  Dumbbell,
  History,
  LayoutDashboard,
  Send,
  TrendingUp,
  Trophy,
  RotateCcw
} from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [resetting, setResetting] = useState(false);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [sessionId] = useState(() => {
    let id = localStorage.getItem("workout_session_id");

    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("workout_session_id", id);
    }

    return id;
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/history`);

      if (!response.ok) {
        throw new Error("Failed to load history");
      }

      const data = await response.json();

      setHistory(data.history || []);
    } catch (error) {
      console.error("HISTORY ERROR:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const resetHistory = async () => {
    if (resetting) return;

    const confirmed = window.confirm(
      "Are you sure you want to reset your entire workout history?"
    );

    if (!confirmed) return;

    setResetting(true);

    try {
      const response = await fetch(`${API_URL}/reset`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Failed to reset workout history");
      }

      setHistory([]);
      setMessages([]);
      setMessage("");

      await loadHistory();
    } catch (error) {
      console.error("RESET ERROR:", error);
      alert("Unable to reset workout history.");
    } finally {
      setResetting(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage
      }
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage
        })
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `Server returned ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response
        }
      ]);

      await loadHistory();
    } catch (error) {
      console.error("CHAT ERROR:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Connection error: ${error.message}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const totalWorkouts = history.length;

  const currentWeek = history.filter((item) => {
    const dateValue = item.created_at || item.date;

    if (!dateValue) return false;

    const workoutDate = new Date(dateValue);
    const today = new Date();

    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return workoutDate >= startOfWeek;
  }).length;

  const latestWorkout =
    history.length > 0 ? history[0] : null;

  const formatDate = (item) => {
    const dateValue = item.created_at || item.date;

    if (!dateValue) return "Recent";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const renderDashboard = () => {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <p className="eyebrow">YOUR PERSONAL AI COACH</p>
            <h2>Good morning 👋</h2>
            <p className="page-description">
              Let's make today's workout count.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() => setActivePage("coach")}
          >
            <Bot size={18} />
            Talk to Coach
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Dumbbell size={21} />
            </div>

            <div>
              <p>Total Workouts</p>
              <h3>{totalWorkouts}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <CalendarDays size={21} />
            </div>

            <div>
              <p>This Week</p>
              <h3>{currentWeek}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Trophy size={21} />
            </div>

            <div>
              <p>Latest Workout</p>
              <h3>
                {latestWorkout
                  ? latestWorkout.exercise
                  : "None yet"}
              </h3>
            </div>
          </div>
        </div>

        <section className="recommendation-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">AI RECOMMENDATION</p>
              <h3>Today's Workout</h3>
            </div>
          </div>

          <div className="recommendation-card">
            <div className="recommendation-icon">
              <Dumbbell size={30} />
            </div>

            <div className="recommendation-content">
              <span className="badge">AI PICK</span>

              <h3>
                {latestWorkout
                  ? "Ready for your next workout?"
                  : "Let's get started"}
              </h3>

              <p>
                Your AI coach will analyze your recent workout
                history and recommend what you should train next.
              </p>

              <button
                className="primary-button"
                onClick={() => {
                  setActivePage("coach");
                  setMessage(
                    "What workout should I do today?"
                  );
                }}
              >
                <Bot size={17} />
                Get Recommendation
              </button>
            </div>
          </div>
        </section>

        <section className="recent-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR ACTIVITY</p>
              <h3>Recent Workouts</h3>
            </div>

            <button
              className="text-button"
              onClick={() => setActivePage("history")}
            >
              View all
            </button>
          </div>

          {loadingHistory ? (
            <div className="empty-state">
              Loading your workouts...
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <Dumbbell size={30} />
              <p>No workouts recorded yet.</p>

              <button
                className="text-button"
                onClick={() => setActivePage("coach")}
              >
                Ask your AI coach to get started
              </button>
            </div>
          ) : (
            <div className="activity-list">
              {history.slice(0, 5).map((item) => (
                <div
                  className="activity-item"
                  key={item.id}
                >
                  <div className="activity-icon">
                    <Activity size={18} />
                  </div>

                  <div className="activity-info">
                    <h4>{item.exercise}</h4>

                    <p>
                      {item.muscle_group || "General"} •{" "}
                      {item.goal || "Workout"}
                    </p>
                  </div>

                  <span className="activity-date">
                    {formatDate(item)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderCoach = () => {
    return (
      <div className="coach-page">
        <div className="page-header">
          <div>
            <p className="eyebrow">AI WORKOUT COACH</p>
            <h2>Let's train smarter 🤖</h2>
            <p className="page-description">
              Ask me anything about your workout.
            </p>
          </div>
        </div>

        <div className="coach-container">
          <div className="coach-messages">
            {messages.length === 0 && (
              <div className="coach-welcome">
                <div className="coach-icon">
                  <Bot size={32} />
                </div>

                <h3>Hi! I'm FitAgent.</h3>

                <p>
                  I can recommend workouts based on your
                  history and remember what you've completed.
                </p>

                <div className="suggestion-grid">
                  <button
                    onClick={() =>
                      setMessage(
                        "I want a strength workout today."
                      )
                    }
                  >
                    💪 Strength workout
                  </button>

                  <button
                    onClick={() =>
                      setMessage(
                        "I want a cardio workout today."
                      )
                    }
                  >
                    🫀 Cardio workout
                  </button>

                  <button
                    onClick={() =>
                      setMessage(
                        "What should I train today?"
                      )
                    }
                  >
                    ✨ What should I train?
                  </button>

                  <button
                    onClick={() =>
                      setMessage(
                        "Show me my recent workout progress."
                      )
                    }
                  >
                    📈 My progress
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${
                  msg.role === "user"
                    ? "chat-user"
                    : "chat-assistant"
                }`}
              >
                <div className="chat-label">
                  {msg.role === "user"
                    ? "You"
                    : "🤖 FitAgent"}
                </div>

                <div className="chat-bubble">
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message chat-assistant">
                <div className="chat-label">
                  🤖 FitAgent
                </div>

                <div className="chat-bubble typing">
                  Thinking about your workout...
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-container">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your workout coach..."
              rows="1"
            />

            <button
              onClick={sendMessage}
              disabled={loading || !message.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <p className="eyebrow">YOUR JOURNEY</p>
            <h2>Workout History 📋</h2>
            <p className="page-description">
              Everything you've completed so far.
            </p>
          </div>

          {history.length > 0 && (
            <button
              className="reset-button"
              onClick={resetHistory}
              disabled={resetting}
            >
              <RotateCcw size={16} />
              {resetting ? "Resetting..." : "Reset History"}
            </button>
          )}
        </div>

        {loadingHistory ? (
          <div className="empty-state">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <History size={35} />

            <h3>No workouts yet</h3>

            <p>
              Complete your first workout and it will appear
              here.
            </p>

            <button
              className="primary-button"
              onClick={() => setActivePage("coach")}
            >
              <Bot size={17} />
              Talk to Coach
            </button>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item, index) => (
              <div
                className="history-card"
                key={item.id}
              >
                <div className="history-number">
                  {index + 1}
                </div>

                <div className="history-main">
                  <h3>{item.exercise}</h3>

                  <p>
                    {item.muscle_group || "General"} •{" "}
                    {item.goal || "Workout"}
                  </p>
                </div>

                <div className="history-date">
                  {formatDate(item)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderProgress = () => {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <p className="eyebrow">YOUR PERFORMANCE</p>
            <h2>Progress 📈</h2>
            <p className="page-description">
              Keep showing up. Consistency wins.
            </p>
          </div>
        </div>

        <div className="progress-grid">
          <div className="progress-card">
            <TrendingUp size={25} />

            <p>Total workouts</p>

            <h2>{totalWorkouts}</h2>

            <span>
              {totalWorkouts === 1
                ? "workout completed"
                : "workouts completed"}
            </span>
          </div>

          <div className="progress-card">
            <CalendarDays size={25} />

            <p>This week</p>

            <h2>{currentWeek}</h2>

            <span>
              {currentWeek === 1
                ? "workout this week"
                : "workouts this week"}
            </span>
          </div>

          <div className="progress-card">
            <Trophy size={25} />

            <p>Keep going</p>

            <h2>🔥</h2>

            <span>
              Build your streak
            </span>
          </div>
        </div>

        {history.length > 0 && (
          <div className="progress-actions">
            <button
              className="reset-button"
              onClick={resetHistory}
              disabled={resetting}
            >
              <RotateCcw size={16} />
              {resetting
                ? "Resetting..."
                : "Reset Progress"}
            </button>
          </div>
        )}

        {history.length === 0 && (
          <div className="empty-state progress-empty">
            <TrendingUp size={32} />

            <h3>No progress yet</h3>

            <p>
              Complete workouts with FitAgent to start
              tracking your progress.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Dumbbell size={22} />
          </div>

          <div>
            <h1>FitAgent</h1>
            <p>AI Workout Coach</p>
          </div>
        </div>

        <nav className="navigation">
          <button
            className={
              activePage === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("dashboard")}
          >
            <LayoutDashboard size={19} />
            Dashboard
          </button>

          <button
            className={
              activePage === "coach"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("coach")}
          >
            <Bot size={19} />
            AI Coach
          </button>

          <button
            className={
              activePage === "history"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("history")}
          >
            <History size={19} />
            Workout History
          </button>

          <button
            className={
              activePage === "progress"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("progress")}
          >
            <TrendingUp size={19} />
            Progress
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="agent-status">
            <span></span>
            Agent Online
          </div>

          <p>FitAgent v1.0</p>
        </div>
      </aside>

      <main className="main-content">
        {activePage === "dashboard" && renderDashboard()}
        {activePage === "coach" && renderCoach()}
        {activePage === "history" && renderHistory()}
        {activePage === "progress" && renderProgress()}
      </main>
    </div>
  );
}

export default App;