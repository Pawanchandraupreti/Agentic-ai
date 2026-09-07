import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  CalendarDays,
  Dumbbell,
  History,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  TrendingUp,
  Trophy,
  RotateCcw,
  Menu,
  X
} from "lucide-react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [resetting, setResetting] = useState(false);

  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);

  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem("fitagent_current_chat");
  });

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadHistory();
    loadChats();
  }, []);

  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem(
        "fitagent_current_chat",
        currentChatId
      );
    }
  }, [currentChatId]);

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/history`);

      if (!response.ok) {
        throw new Error("Failed to load workout history");
      }

      const data = await response.json();

      setHistory(data.history || []);
    } catch (error) {
      console.error("HISTORY ERROR:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadChats = async () => {
    try {
      setLoadingChats(true);

      const response = await fetch(`${API_URL}/chats`);

      if (!response.ok) {
        throw new Error("Failed to load chats");
      }

      const data = await response.json();
      const savedChats = data.chats || [];

      setChats(savedChats);

      if (savedChats.length === 0) {
        await createNewChat();
        return;
      }

      const storedChatId = localStorage.getItem(
        "fitagent_current_chat"
      );

      const storedChatExists = savedChats.some(
        (chat) => chat.id === storedChatId
      );

      if (storedChatExists) {
        await loadChat(storedChatId, false);
      } else {
        await loadChat(savedChats[0].id, false);
      }
    } catch (error) {
      console.error("CHAT LIST ERROR:", error);
    } finally {
      setLoadingChats(false);
    }
  };

  const createNewChat = async () => {
    if (creatingChat) return null;

    setCreatingChat(true);

    try {
      const newSessionId = crypto.randomUUID();

      const response = await fetch(`${API_URL}/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          session_id: newSessionId,
          title: "New Workout Chat"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `Server returned ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      const newChat = {
        id: data.session_id,
        title: "New Workout Chat",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setChats((prev) => [newChat, ...prev]);

      setCurrentChatId(data.session_id);

      setMessages([]);
      setMessage("");
      setActivePage("coach");
      setSidebarOpen(false);

      return data.session_id;
    } catch (error) {
      console.error("CREATE CHAT ERROR:", error);
      alert("Unable to create a new chat.");
      return null;
    } finally {
      setCreatingChat(false);
    }
  };

  const loadChat = async (chatId, closeSidebar = true) => {
    if (!chatId) return;

    try {
      const response = await fetch(
        `${API_URL}/chats/${chatId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load conversation");
      }

      const data = await response.json();

      setCurrentChatId(chatId);
      setMessages(data.messages || []);
      setMessage("");
      setActivePage("coach");

      if (closeSidebar) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error("LOAD CHAT ERROR:", error);
      alert("Unable to load this conversation.");
    }
  };

  const deleteChat = async (chatId, event) => {
    if (event) {
      event.stopPropagation();
    }

    if (deletingChat) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this conversation?"
    );

    if (!confirmed) return;

    setDeletingChat(true);

    try {
      const response = await fetch(
        `${API_URL}/chats/${chatId}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete chat");
      }

      const remainingChats = chats.filter(
        (chat) => chat.id !== chatId
      );

      setChats(remainingChats);

      if (currentChatId === chatId) {
        if (remainingChats.length > 0) {
          await loadChat(
            remainingChats[0].id,
            false
          );
        } else {
          localStorage.removeItem(
            "fitagent_current_chat"
          );

          setCurrentChatId(null);
          setMessages([]);

          await createNewChat();
        }
      }
    } catch (error) {
      console.error("DELETE CHAT ERROR:", error);
      alert("Unable to delete this conversation.");
    } finally {
      setDeletingChat(false);
    }
  };

  const renameChat = async (chatId, title) => {
    try {
      const response = await fetch(
        `${API_URL}/chats/${chatId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to rename chat");
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                title
              }
            : chat
        )
      );
    } catch (error) {
      console.error("RENAME CHAT ERROR:", error);
    }
  };

  /*
    IMPORTANT FIX:

    The send button is now allowed to activate
    whenever the user types a message.

    If currentChatId does not exist, this function
    automatically creates a chat before sending.
  */
  const sendMessage = async () => {
    if (!message.trim() || loading) {
      return;
    }

    const userMessage = message.trim();

    let chatId = currentChatId;

    try {
      /*
        If there is no active chat, create one automatically.
      */
      if (!chatId) {
        const newSessionId = crypto.randomUUID();

        const createResponse = await fetch(
          `${API_URL}/chats`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              session_id: newSessionId,
              title: "New Workout Chat"
            })
          }
        );

        if (!createResponse.ok) {
          const errorText =
            await createResponse.text();

          throw new Error(
            `Unable to create chat. Server returned ${createResponse.status}: ${errorText}`
          );
        }

        const createData =
          await createResponse.json();

        chatId =
          createData.session_id ||
          newSessionId;

        setCurrentChatId(chatId);

        const newChat = {
          id: chatId,
          title: "New Workout Chat",
          created_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString()
        };

        setChats((prev) => [
          newChat,
          ...prev.filter(
            (chat) => chat.id !== chatId
          )
        ]);
      }

      const isFirstMessage =
        messages.length === 0;

      /*
        Immediately show user's message.
      */
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: userMessage
        }
      ]);

      setMessage("");
      setLoading(true);

      /*
        Send message to backend.
      */
      const response = await fetch(
        `${API_URL}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_id: chatId,
            message: userMessage
          })
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `Server returned ${response.status}: ${errorText}`
        );
      }

      const data =
        await response.json();

      /*
        Show AI response.
      */
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response
        }
      ]);

      /*
        Rename chat after first message.
      */
      if (isFirstMessage) {
        const title =
          userMessage.length > 35
            ? `${userMessage.substring(
                0,
                35
              )}...`
            : userMessage;

        await renameChat(
          chatId,
          title
        );
      }

      /*
        Refresh sidebar and workout history.
      */
      await loadChatsWithoutChangingChat();
      await loadHistory();

    } catch (error) {
      console.error(
        "CHAT ERROR:",
        error
      );

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

  const loadChatsWithoutChangingChat =
    async () => {
      try {
        const response =
          await fetch(
            `${API_URL}/chats`
          );

        if (!response.ok) return;

        const data =
          await response.json();

        setChats(
          data.chats || []
        );
      } catch (error) {
        console.error(
          "REFRESH CHATS ERROR:",
          error
        );
      }
    };

  const clearCurrentChat =
    async () => {
      if (!currentChatId) return;

      const confirmed =
        window.confirm(
          "Clear all messages from this conversation?"
        );

      if (!confirmed) return;

      try {
        const response =
          await fetch(
            `${API_URL}/chats/${currentChatId}/reset`,
            {
              method: "POST"
            }
          );

        if (!response.ok) {
          throw new Error(
            "Failed to clear chat"
          );
        }

        setMessages([]);
        setMessage("");

      } catch (error) {
        console.error(
          "CLEAR CHAT ERROR:",
          error
        );

        alert(
          "Unable to clear this conversation."
        );
      }
    };

  const resetHistory =
    async () => {
      if (resetting) return;

      const confirmed =
        window.confirm(
          "Are you sure you want to reset your entire workout history?"
        );

      if (!confirmed) return;

      setResetting(true);

      try {
        const response =
          await fetch(
            `${API_URL}/reset`,
            {
              method: "POST"
            }
          );

        if (!response.ok) {
          throw new Error(
            "Failed to reset workout history"
          );
        }

        setHistory([]);

        await loadHistory();

      } catch (error) {
        console.error(
          "RESET ERROR:",
          error
        );

        alert(
          "Unable to reset workout history."
        );

      } finally {
        setResetting(false);
      }
    };

  const handleKeyDown =
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        sendMessage();
      }
    };

  const formatDate =
    (item) => {
      const dateValue =
        item.created_at ||
        item.date;

      if (!dateValue)
        return "Recent";

      const date =
        new Date(dateValue);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return dateValue;
      }

      return date.toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      );
    };

  const formatChatDate =
    (chat) => {
      const dateValue =
        chat.updated_at ||
        chat.created_at;

      if (!dateValue)
        return "";

      const date =
        new Date(dateValue);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }

      const today =
        new Date();

      if (
        date.toDateString() ===
        today.toDateString()
      ) {
        return date.toLocaleTimeString(
          "en-IN",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        );
      }

      return date.toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short"
        }
      );
    };

  const totalWorkouts =
    history.length;

  const currentWeek =
    history.filter(
      (item) => {
        const dateValue =
          item.created_at ||
          item.date;

        if (!dateValue)
          return false;

        const workoutDate =
          new Date(dateValue);

        const today =
          new Date();

        const startOfWeek =
          new Date(today);

        startOfWeek.setHours(
          0,
          0,
          0,
          0
        );

        startOfWeek.setDate(
          today.getDate() -
            today.getDay()
        );

        return (
          workoutDate >=
          startOfWeek
        );
      }
    ).length;

  const latestWorkout =
    history.length > 0
      ? history[0]
      : null;

  const renderDashboard =
    () => {
      return (
        <div className="page">

          <div className="page-header">

            <div>
              <p className="eyebrow">
                YOUR PERSONAL AI COACH
              </p>

              <h2>
                Good morning 👋
              </h2>

              <p className="page-description">
                Let's make today's workout count.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() =>
                setActivePage(
                  "coach"
                )
              }
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
                <h3>
                  {totalWorkouts}
                </h3>
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon">
                <CalendarDays size={21} />
              </div>

              <div>
                <p>This Week</p>
                <h3>
                  {currentWeek}
                </h3>
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
                <p className="eyebrow">
                  AI RECOMMENDATION
                </p>

                <h3>
                  Today's Workout
                </h3>
              </div>

            </div>

            <div className="recommendation-card">

              <div className="recommendation-icon">
                <Dumbbell size={30} />
              </div>

              <div className="recommendation-content">

                <span className="badge">
                  AI PICK
                </span>

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
                    setActivePage(
                      "coach"
                    );

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
                <p className="eyebrow">
                  YOUR ACTIVITY
                </p>

                <h3>
                  Recent Workouts
                </h3>
              </div>

              <button
                className="text-button"
                onClick={() =>
                  setActivePage(
                    "history"
                  )
                }
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

                <p>
                  No workouts recorded yet.
                </p>

                <button
                  className="text-button"
                  onClick={() =>
                    setActivePage(
                      "coach"
                    )
                  }
                >
                  Ask your AI coach to get started
                </button>

              </div>

            ) : (

              <div className="activity-list">

                {history
                  .slice(0, 5)
                  .map(
                    (item) => (
                      <div
                        className="activity-item"
                        key={item.id}
                      >

                        <div className="activity-icon">
                          <Activity size={18} />
                        </div>

                        <div className="activity-info">

                          <h4>
                            {item.exercise}
                          </h4>

                          <p>
                            {item.muscle_group ||
                              "General"}{" "}
                            •{" "}
                            {item.goal ||
                              "Workout"}
                          </p>

                        </div>

                        <span className="activity-date">
                          {formatDate(item)}
                        </span>

                      </div>
                    )
                  )}

              </div>

            )}

          </section>

        </div>
      );
    };

  const renderCoach =
    () => {
      return (
        <div className="coach-page">

          <div className="page-header">

            <div>

              <p className="eyebrow">
                AI WORKOUT COACH
              </p>

              <h2>
                Let's train smarter 🤖
              </h2>

              <p className="page-description">
                Ask me anything about your workout.
              </p>

            </div>

            <div className="coach-actions">

              {messages.length > 0 && (
                <button
                  className="reset-button"
                  onClick={
                    clearCurrentChat
                  }
                >
                  <RotateCcw size={16} />
                  Clear Chat
                </button>
              )}

            </div>

          </div>

          <div className="coach-container">

            <div className="coach-messages">

              {messages.length === 0 && (

                <div className="coach-welcome">

                  <div className="coach-icon">
                    <Bot size={32} />
                  </div>

                  <h3>
                    Hi! I'm FitAgent.
                  </h3>

                  <p>
                    I can recommend workouts based on your
                    history and remember what you've completed.
                    Your conversations are now saved automatically.
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

              {messages.map(
                (msg, index) => (

                  <div
                    key={`${msg.created_at || ""}-${index}`}
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

                )
              )}

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
                onChange={(e) =>
                  setMessage(
                    e.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Ask your workout coach..."
                rows="1"
              />

              <button
                onClick={sendMessage}
                disabled={
                  loading ||
                  !message.trim()
                }
              >
                <Send size={18} />
              </button>

            </div>

          </div>

        </div>
      );
    };

  const renderHistory =
    () => {
      return (
        <div className="page">

          <div className="page-header">

            <div>

              <p className="eyebrow">
                YOUR JOURNEY
              </p>

              <h2>
                Workout History 📋
              </h2>

              <p className="page-description">
                Everything you've completed so far.
              </p>

            </div>

            {history.length > 0 && (

              <button
                className="reset-button"
                onClick={
                  resetHistory
                }
                disabled={resetting}
              >

                <RotateCcw size={16} />

                {resetting
                  ? "Resetting..."
                  : "Reset History"}

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

              <h3>
                No workouts yet
              </h3>

              <p>
                Complete your first workout and it will appear
                here.
              </p>

              <button
                className="primary-button"
                onClick={() =>
                  setActivePage(
                    "coach"
                  )
                }
              >
                <Bot size={17} />
                Talk to Coach
              </button>

            </div>

          ) : (

            <div className="history-list">

              {history.map(
                (item, index) => (

                  <div
                    className="history-card"
                    key={item.id}
                  >

                    <div className="history-number">
                      {index + 1}
                    </div>

                    <div className="history-main">

                      <h3>
                        {item.exercise}
                      </h3>

                      <p>
                        {item.muscle_group ||
                          "General"}{" "}
                        •{" "}
                        {item.goal ||
                          "Workout"}
                      </p>

                    </div>

                    <div className="history-date">
                      {formatDate(item)}
                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>
      );
    };

  const renderProgress =
    () => {
      return (
        <div className="page">

          <div className="page-header">

            <div>

              <p className="eyebrow">
                YOUR PERFORMANCE
              </p>

              <h2>
                Progress 📈
              </h2>

              <p className="page-description">
                Keep showing up. Consistency wins.
              </p>

            </div>

          </div>

          <div className="progress-grid">

            <div className="progress-card">

              <TrendingUp size={25} />

              <p>
                Total workouts
              </p>

              <h2>
                {totalWorkouts}
              </h2>

              <span>
                {totalWorkouts === 1
                  ? "workout completed"
                  : "workouts completed"}
              </span>

            </div>

            <div className="progress-card">

              <CalendarDays size={25} />

              <p>
                This week
              </p>

              <h2>
                {currentWeek}
              </h2>

              <span>
                {currentWeek === 1
                  ? "workout this week"
                  : "workouts this week"}
              </span>

            </div>

            <div className="progress-card">

              <Trophy size={25} />

              <p>
                Keep going
              </p>

              <h2>
                🔥
              </h2>

              <span>
                Build your streak
              </span>

            </div>

          </div>

          {history.length > 0 && (

            <div className="progress-actions">

              <button
                className="reset-button"
                onClick={
                  resetHistory
                }
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

              <h3>
                No progress yet
              </h3>

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

      {sidebarOpen && (

        <div
          className="sidebar-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />

      )}

      <aside
        className={`sidebar ${
          sidebarOpen
            ? "sidebar-open"
            : ""
        }`}
      >

        <div className="brand">

          <div className="brand-icon">
            <Dumbbell size={22} />
          </div>

          <div>

            <h1>
              FitAgent
            </h1>

            <p>
              AI Workout Coach
            </p>

          </div>

          <button
            className="mobile-close"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <X size={20} />
          </button>

        </div>

        <button
          className="new-chat-button"
          onClick={createNewChat}
          disabled={creatingChat}
        >

          <Plus size={18} />

          {creatingChat
            ? "Creating..."
            : "New Chat"}

        </button>

        <div className="chat-history-section">

          <div className="chat-history-title">

            <MessageSquare size={14} />

            <span>
              CHAT HISTORY
            </span>

          </div>

          <div className="chat-list">

            {loadingChats ? (

              <div className="chat-list-loading">
                Loading chats...
              </div>

            ) : chats.length === 0 ? (

              <div className="chat-list-empty">
                No conversations yet.
              </div>

            ) : (

              chats.map(
                (chat) => (

                  <div
                    key={chat.id}
                    className={`saved-chat ${
                      currentChatId === chat.id
                        ? "saved-chat-active"
                        : ""
                    }`}
                    onClick={() =>
                      loadChat(
                        chat.id
                      )
                    }
                  >

                    <div className="saved-chat-icon">
                      <MessageSquare size={15} />
                    </div>

                    <div className="saved-chat-content">

                      <div className="saved-chat-title">

                        {chat.title ||
                          "New Workout Chat"}

                      </div>

                      <div className="saved-chat-date">

                        {formatChatDate(
                          chat
                        )}

                      </div>

                    </div>

                    <button
                      className="delete-chat-button"
                      onClick={(event) =>
                        deleteChat(
                          chat.id,
                          event
                        )
                      }
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>

                  </div>

                )
              )

            )}

          </div>

        </div>

        <nav className="navigation">

          <div className="navigation-divider" />

          <button
            className={
              activePage === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => {
              setActivePage(
                "dashboard"
              );

              setSidebarOpen(false);
            }}
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
            onClick={() => {
              setActivePage(
                "coach"
              );

              setSidebarOpen(false);
            }}
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
            onClick={() => {
              setActivePage(
                "history"
              );

              setSidebarOpen(false);
            }}
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
            onClick={() => {
              setActivePage(
                "progress"
              );

              setSidebarOpen(false);
            }}
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

          <p>
            FitAgent v2.0
          </p>

        </div>

      </aside>

      <main className="main-content">

        <button
          className="mobile-menu-button"
          onClick={() =>
            setSidebarOpen(true)
          }
        >
          <Menu size={21} />
        </button>

        {activePage ===
          "dashboard" &&
          renderDashboard()}

        {activePage ===
          "coach" &&
          renderCoach()}

        {activePage ===
          "history" &&
          renderHistory()}

        {activePage ===
          "progress" &&
          renderProgress()}

      </main>

    </div>
  );
}

export default App;