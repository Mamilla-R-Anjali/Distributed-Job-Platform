import "./App.css";
import { useEffect, useState } from "react";

const API_URL = "/api/jobs";
const AUTH_URL = "/api/auth";

function App() {
  const [jobs, setJobs] = useState([]);
  const [jobName, setJobName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || "User"
  );

  const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [jobSearch, setJobSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected job for the Job Details drawer.
  const [selectedJob, setSelectedJob] = useState(null);

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");

    setToken(null);
    setUserName("User");
    setJobs([]);
    setSelectedJob(null);
    setError("");
    setJobSearch("");
    setStatusFilter("ALL");
  };

  const handleAuth = async (event) => {
    event.preventDefault();

    setAuthError("");

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Email and password are required.");
      return;
    }

    if (authMode === "register" && !authName.trim()) {
      setAuthError("Name is required.");
      return;
    }

    try {
      setAuthLoading(true);

      const endpoint =
        authMode === "login"
          ? `${AUTH_URL}/login`
          : `${AUTH_URL}/register`;

      const requestBody =
        authMode === "login"
          ? {
              email: authEmail.trim(),
              password: authPassword,
            }
          : {
              name: authName.trim(),
              email: authEmail.trim(),
              password: authPassword,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      let data = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        data = {
          message: responseText,
        };
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Authentication failed. HTTP ${response.status}`
        );
      }

      if (authMode === "register") {
        setAuthMode("login");
        setAuthPassword("");
        setAuthName("");
        setAuthError(
          "Registration successful. Please log in."
        );
        return;
      }

      if (!data.token) {
        throw new Error(
          "Login succeeded but no authentication token was returned."
        );
      }

      localStorage.setItem("token", data.token);

      if (data.userId !== undefined) {
        localStorage.setItem(
          "userId",
          String(data.userId)
        );
      }

      if (data.name) {
        localStorage.setItem(
          "userName",
          data.name
        );

        setUserName(data.name);
      }

      if (data.email) {
        localStorage.setItem(
          "userEmail",
          data.email
        );
      }

      setToken(data.token);

      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      setAuthError("");
      setError("");
      setJobs([]);
      setSelectedJob(null);
      setLoading(true);
    } catch (err) {
      console.error("AUTH ERROR:", err);

      setAuthError(
        err.message || "Authentication failed."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const loadJobs = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      }

      setError("");

      const currentToken = getToken();

      if (!currentToken) {
        setJobs([]);
        setError(
          "You are not logged in. Please log in first."
        );
        return;
      }

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logout();

        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      if (!response.ok) {
        const responseText =
          await response.text();

        throw new Error(
          `Failed to load jobs. HTTP ${response.status}: ${responseText}`
        );
      }

      const data = await response.json();

      setJobs(
        Array.isArray(data) ? data : []
      );

      // Keep the open details drawer synchronized
      // with the newest automatically refreshed job data.
      if (selectedJob) {
        const updatedSelectedJob = (
          Array.isArray(data) ? data : []
        ).find(
          (job) => String(job.id) === String(selectedJob.id)
        );

        if (updatedSelectedJob) {
          setSelectedJob(updatedSelectedJob);
        } else {
          setSelectedJob(null);
        }
      }
    } catch (err) {
      console.error("LOAD JOBS ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);

      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  };

  const handleManualRefresh = () => {
    if (refreshing) {
      return;
    }

    loadJobs(true);
  };

  const createJob = async (event) => {
    event.preventDefault();

    if (!jobName.trim()) {
      return;
    }

    try {
      setCreating(true);
      setError("");

      const currentToken = getToken();

      if (!currentToken) {
        setError(
          "You are not logged in. Please log in first."
        );
        return;
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          name: jobName.trim(),
        }),
      });

      const responseText =
        await response.text();

      console.log(
        "CREATE JOB STATUS:",
        response.status
      );

      console.log(
        "CREATE JOB RESPONSE:",
        responseText
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        logout();

        setError(
          "Your session has expired. Please log in again."
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to create job. HTTP ${response.status}: ${responseText}`
        );
      }

      setJobName("");

      await loadJobs();
    } catch (err) {
      console.error(
        "CREATE JOB ERROR:",
        err
      );

      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setJobs([]);
      return;
    }

    loadJobs();

    const interval = setInterval(() => {
      loadJobs();
    }, 3000);

    return () =>
      clearInterval(interval);
  }, [token]);

  // Close the details drawer with the Escape key.
  useEffect(() => {
    if (!selectedJob) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedJob(null);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [selectedJob]);

  const openJobDetails = (job) => {
    setSelectedJob(job);
  };

  const closeJobDetails = () => {
    setSelectedJob(null);
  };

  const getStatusClass = (status) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return "status-completed";

      case "FAILED":
        return "status-failed";

      case "PROCESSING":
      case "RUNNING":
        return "status-processing";

      case "PENDING":
        return "status-pending";

      default:
        return "status-other";
    }
  };

  const getStatusDotClass = (status) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return "status-dot-completed";

      case "FAILED":
        return "status-dot-failed";

      case "PROCESSING":
      case "RUNNING":
        return "status-dot-processing";

      case "PENDING":
        return "status-dot-pending";

      default:
        return "status-dot-other";
    }
  };

  const totalJobs = jobs.length;

  const pendingJobs = jobs.filter(
    (job) =>
      job.status?.toUpperCase() === "PENDING"
  ).length;

  const processingJobs = jobs.filter(
    (job) => {
      const status =
        job.status?.toUpperCase();

      return (
        status === "PROCESSING" ||
        status === "RUNNING"
      );
    }
  ).length;

  const completedJobs = jobs.filter(
    (job) =>
      job.status?.toUpperCase() === "COMPLETED"
  ).length;

  const failedJobs = jobs.filter(
    (job) =>
      job.status?.toUpperCase() === "FAILED"
  ).length;

  const filteredJobs = jobs.filter((job) => {
    const normalizedSearch =
      jobSearch.trim().toLowerCase();

    const normalizedStatus =
      job.status?.toUpperCase() || "";

    let matchesStatus = true;

    if (statusFilter === "PENDING") {
      matchesStatus =
        normalizedStatus === "PENDING";
    } else if (statusFilter === "RUNNING") {
      matchesStatus =
        normalizedStatus === "PROCESSING" ||
        normalizedStatus === "RUNNING";
    } else if (statusFilter === "COMPLETED") {
      matchesStatus =
        normalizedStatus === "COMPLETED";
    } else if (statusFilter === "FAILED") {
      matchesStatus =
        normalizedStatus === "FAILED";
    }

    if (!normalizedSearch) {
      return matchesStatus;
    }

    const jobId =
      String(job.id || "").toLowerCase();

    const name =
      String(job.name || "").toLowerCase();

    const result =
      String(job.result || "").toLowerCase();

    const matchesSearch =
      jobId.includes(normalizedSearch) ||
      name.includes(normalizedSearch) ||
      result.includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });

  const selectMetric = (filter) => {
    setStatusFilter(filter);
    setJobSearch("");

    window.requestAnimationFrame(() => {
      const jobsSection =
        document.querySelector(".jobs-section");

      if (jobsSection) {
        jobsSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  };

  const filterOptions = [
    {
      value: "ALL",
      label: "All jobs",
      shortLabel: "All",
      count: totalJobs,
    },
    {
      value: "PENDING",
      label: "Pending",
      shortLabel: "Pending",
      count: pendingJobs,
    },
    {
      value: "RUNNING",
      label: "Running",
      shortLabel: "Running",
      count: processingJobs,
    },
    {
      value: "COMPLETED",
      label: "Completed",
      shortLabel: "Completed",
      count: completedJobs,
    },
    {
      value: "FAILED",
      label: "Failed",
      shortLabel: "Failed",
      count: failedJobs,
    },
  ];

  const formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

    const match = String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
    );

    if (!match) {
      return value;
    }

    const [
      ,
      year,
      month,
      day,
      hour,
      minute,
      second = "00",
    ] = match;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getJobLifecycle = (job) => {
    const status =
      job?.status?.toUpperCase() || "";

    return {
      submitted: true,
      queued:
        status === "PENDING" ||
        status === "PROCESSING" ||
        status === "RUNNING" ||
        status === "COMPLETED" ||
        status === "FAILED",
      executing:
        status === "PROCESSING" ||
        status === "RUNNING" ||
        status === "COMPLETED" ||
        status === "FAILED",
      completed:
        status === "COMPLETED" ||
        status === "FAILED",
    };
  };

  const metricCards = [
    {
      value: "ALL",
      label: "Total jobs",
      number: totalJobs,
      caption: "All submitted workloads",
      action: "Open activity",
      type: "primary",
    },
    {
      value: "PENDING",
      label: "Pending",
      number: pendingJobs,
      caption: "Waiting in the queue",
      action: "View queue",
      type: "pending",
    },
    {
      value: "RUNNING",
      label: "Running",
      number: processingJobs,
      caption: "Workers processing now",
      action: "View running",
      type: "processing",
    },
    {
      value: "COMPLETED",
      label: "Completed",
      number: completedJobs,
      caption: "Successfully finished",
      action: "View results",
      type: "completed",
    },
    {
      value: "FAILED",
      label: "Failed",
      number: failedJobs,
      caption: "Requiring attention",
      action: "Review failures",
      type: "failed",
    },
  ];

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-shell">

          <section className="auth-brand-panel">

            <div className="auth-brand-top">
              <div className="auth-brand-mark">
                DS
              </div>

              <span>
                DISTRIBUTED SYSTEM
              </span>
            </div>

            <div className="auth-brand-content">

              <span className="auth-kicker">
                JOB ORCHESTRATION PLATFORM
              </span>

              <h1>
                Distributed processing,
                <br />
                made visible.
              </h1>

              <p>
                Submit jobs, monitor execution,
                and track distributed processing
                from one reliable workspace.
              </p>

              <div className="auth-capabilities">

                <div className="auth-capability">
                  <span className="capability-icon">
                    01
                  </span>

                  <div>
                    <strong>
                      Distributed execution
                    </strong>

                    <span>
                      Jobs are processed through
                      the distributed worker system.
                    </span>
                  </div>
                </div>

                <div className="auth-capability">
                  <span className="capability-icon">
                    02
                  </span>

                  <div>
                    <strong>
                      Event-driven processing
                    </strong>

                    <span>
                      Kafka coordinates asynchronous
                      job processing.
                    </span>
                  </div>
                </div>

                <div className="auth-capability">
                  <span className="capability-icon">
                    03
                  </span>

                  <div>
                    <strong>
                      Live job monitoring
                    </strong>

                    <span>
                      Follow job status from submission
                      through completion.
                    </span>
                  </div>
                </div>

              </div>

            </div>

            <div className="auth-brand-footer">
              <span>
                DISTRIBUTED JOB PLATFORM
              </span>

              <span>
                ENGINEERING WORKSPACE
              </span>
            </div>

          </section>

          <section className="auth-form-panel">

            <div className="auth-mobile-brand">
              <div className="auth-brand-mark">
                DS
              </div>

              <div>
                <span>
                  DISTRIBUTED SYSTEM
                </span>

                <strong>
                  Distributed Job Platform
                </strong>
              </div>
            </div>

            <div className="auth-form-container">

              <div className="auth-intro">

                <span className="auth-kicker">
                  {authMode === "login"
                    ? "WELCOME BACK"
                    : "GET STARTED"}
                </span>

                <h2>
                  {authMode === "login"
                    ? "Sign in to your workspace"
                    : "Create your workspace"}
                </h2>

                <p>
                  {authMode === "login"
                    ? "Access your distributed job dashboard."
                    : "Create an account to submit and monitor jobs."}
                </p>

              </div>

              <div className="auth-tabs">

                <button
                  type="button"
                  className={
                    authMode === "login"
                      ? "auth-tab active"
                      : "auth-tab"
                  }
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                >
                  Sign in
                </button>

                <button
                  type="button"
                  className={
                    authMode === "register"
                      ? "auth-tab active"
                      : "auth-tab"
                  }
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                  }}
                >
                  Register
                </button>

              </div>

              <form
                onSubmit={handleAuth}
                className="auth-form"
              >

                {authMode === "register" && (
                  <div className="auth-field">

                    <label htmlFor="auth-name">
                      Full name
                    </label>

                    <input
                      id="auth-name"
                      type="text"
                      placeholder="Enter your name"
                      value={authName}
                      onChange={(event) =>
                        setAuthName(
                          event.target.value
                        )
                      }
                      disabled={authLoading}
                    />

                  </div>
                )}

                <div className="auth-field">

                  <label htmlFor="auth-email">
                    Email address
                  </label>

                  <input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={authEmail}
                    onChange={(event) =>
                      setAuthEmail(
                        event.target.value
                      )
                    }
                    disabled={authLoading}
                  />

                </div>

                <div className="auth-field">

                  <div className="auth-label-row">
                    <label htmlFor="auth-password">
                      Password
                    </label>

                    <span>
                      Required
                    </span>
                  </div>

                  <input
                    id="auth-password"
                    type="password"
                    placeholder="Enter your password"
                    value={authPassword}
                    onChange={(event) =>
                      setAuthPassword(
                        event.target.value
                      )
                    }
                    disabled={authLoading}
                  />

                </div>

                {authError && (
                  <div
                    className={
                      authError.includes(
                        "successful"
                      )
                        ? "auth-success"
                        : "auth-error"
                    }
                  >
                    <span className="auth-message-icon">
                      {authError.includes(
                        "successful"
                      )
                        ? "✓"
                        : "!"}
                    </span>

                    <span>
                      {authError}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={authLoading}
                >
                  <span>
                    {authLoading
                      ? "Please wait..."
                      : authMode === "login"
                      ? "Sign in"
                      : "Create account"}
                  </span>

                  {!authLoading && (
                    <span className="button-arrow">
                      →
                    </span>
                  )}
                </button>

              </form>

              <div className="auth-switch">

                {authMode === "login" ? (
                  <p>
                    Don't have an account?{" "}

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setAuthError("");
                      }}
                    >
                      Create one
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                      }}
                    >
                      Sign in
                    </button>
                  </p>
                )}

              </div>

              <div className="auth-security-note">
                <span className="security-icon">
                  ✓
                </span>

                <span>
                  Your authenticated session is
                  protected by the platform.
                </span>
              </div>

            </div>

          </section>

        </div>
      </div>
    );
  }

  return (
    <div className="app">

      <header className="topbar">

        <div className="topbar-brand">

          <div className="brand-mark">
            DS
          </div>

          <div className="brand-copy">

            <span className="brand-eyebrow">
              DISTRIBUTED SYSTEM
            </span>

            <strong>
              Distributed Job Platform
            </strong>

          </div>

        </div>

        <div className="topbar-right">

          <div className="system-status">
            <span className="system-status-dot" />

            <span>
              SYSTEM ONLINE
            </span>
          </div>

          <div className="topbar-divider" />

          <div className="user-menu">

            <div className="user-avatar">
              {userName
                ? userName
                    .trim()
                    .charAt(0)
                    .toUpperCase()
                : "U"}
            </div>

            <div className="user-details">

              <span>
                Signed in as
              </span>

              <strong>
                {userName}
              </strong>

            </div>

          </div>

          <div className="topbar-actions">

            <button
              type="button"
              className={
                refreshing
                  ? "topbar-button refreshing"
                  : "topbar-button"
              }
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh jobs"
            >
              <span
                className={
                  refreshing
                    ? "refresh-icon spinning"
                    : "refresh-icon"
                }
              >
                ↻
              </span>

              <span>
                {refreshing
                  ? "Refreshing"
                  : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              className="logout-button"
              onClick={logout}
            >
              Sign out
            </button>

          </div>

        </div>

      </header>

      <main className="dashboard">

        <section className="hero-section">

          <div className="hero-copy">

            <div className="hero-title-line">

              <span className="page-kicker">
                OPERATIONS
              </span>

              <span className="hero-live-indicator">
                <span />
                LIVE
              </span>

            </div>

            <h1>
              Job operations
            </h1>

            <p>
              A live control surface for submitting,
              monitoring, and reviewing distributed workloads.
            </p>

          </div>

          <div className="hero-meta">

            <span>
              SYSTEM ACTIVITY
            </span>

            <strong>
              Continuous monitoring
            </strong>

            <small>
              Automatic refresh every 3 seconds
            </small>

          </div>

        </section>

        <section className="operations-overview">

          <div className="overview-heading">

            <div>
              <span className="section-label">
                OPERATIONS OVERVIEW
              </span>

              <h2>
                Workload state
              </h2>
            </div>

            <span className="overview-total">
              {filteredJobs.length} visible
            </span>

          </div>

          <div className="metrics-grid">

            {metricCards.map((metric) => (
              <button
                key={metric.value}
                type="button"
                className={
                  statusFilter === metric.value
                    ? `metric-card metric-clickable active metric-${metric.type}`
                    : `metric-card metric-clickable metric-${metric.type}`
                }
                onClick={() =>
                  selectMetric(metric.value)
                }
              >

                <div className="metric-top">

                  <span className="metric-label">
                    {metric.label}
                  </span>

                  {metric.value === "ALL" ? (
                    <span className="metric-index">
                      LIVE
                    </span>
                  ) : (
                    <span
                      className={`metric-indicator ${metric.type}`}
                    />
                  )}

                </div>

                <div className="metric-main">

                  <strong className="metric-value">
                    {metric.number}
                  </strong>

                  <span className="metric-caption">
                    {metric.caption}
                  </span>

                </div>

                <div className="metric-footer">

                  <span>
                    {metric.action}
                  </span>

                  <span className="metric-arrow">
                    →
                  </span>

                </div>

              </button>
            ))}

          </div>

        </section>

        <section className="workspace-grid">

          <div className="create-panel">

            <div className="panel-heading">

              <div className="panel-title-group">

                <span className="panel-kicker">
                  NEW WORKLOAD
                </span>

                <h2>
                  Submit a job
                </h2>

                <p>
                  Create a workload and send it into
                  the distributed execution pipeline.
                </p>

              </div>

              <div className="ready-badge">
                <span />
                READY
              </div>

            </div>

            <form
              onSubmit={createJob}
              className="create-form"
            >

              <div className="create-input-area">

                <label htmlFor="job-name">
                  Job name
                </label>

                <input
                  id="job-name"
                  type="text"
                  placeholder="e.g. Data Processing Job"
                  value={jobName}
                  onChange={(event) =>
                    setJobName(
                      event.target.value
                    )
                  }
                  disabled={creating}
                />

                <span>
                  Use a descriptive name to identify
                  the workload in job activity.
                </span>

              </div>

              <button
                type="submit"
                className="create-button"
                disabled={
                  creating ||
                  !jobName.trim()
                }
              >
                <span>
                  {creating
                    ? "Submitting..."
                    : "Submit job"}
                </span>

                {!creating && (
                  <span>
                    →
                  </span>
                )}
              </button>

            </form>

            <div className="create-footer">

              <div className="create-footer-status">

                <span className="live-dot" />

                <strong>
                  Processing pipeline ready
                </strong>

              </div>

              <span>
                Jobs are handled asynchronously
                by the distributed worker system.
              </span>

            </div>

          </div>

          <aside className="system-panel">

            <div className="system-panel-header">

              <div>
                <span className="panel-kicker">
                  EXECUTION FLOW
                </span>

                <h3>
                  Distributed processing
                </h3>
              </div>

              <span className="system-live">
                LIVE
              </span>

            </div>

            <p className="system-panel-description">
              Every workload follows the same
              asynchronous processing path.
            </p>

            <div className="pipeline">

              <div className="pipeline-step">

                <div className="pipeline-marker">
                  <span className="pipeline-number">
                    01
                  </span>
                </div>

                <div className="pipeline-content">
                  <span className="pipeline-stage">
                    SUBMIT
                  </span>

                  <strong>
                    Request accepted
                  </strong>
                </div>

              </div>

              <div className="pipeline-line" />

              <div className="pipeline-step">

                <div className="pipeline-marker">
                  <span className="pipeline-number">
                    02
                  </span>
                </div>

                <div className="pipeline-content">
                  <span className="pipeline-stage">
                    QUEUE
                  </span>

                  <strong>
                    Event queued
                  </strong>
                </div>

              </div>

              <div className="pipeline-line" />

              <div className="pipeline-step">

                <div className="pipeline-marker">
                  <span className="pipeline-number">
                    03
                  </span>
                </div>

                <div className="pipeline-content">
                  <span className="pipeline-stage">
                    EXECUTE
                  </span>

                  <strong>
                    Worker processing
                  </strong>
                </div>

              </div>

              <div className="pipeline-line" />

              <div className="pipeline-step">

                <div className="pipeline-marker">
                  <span className="pipeline-number">
                    04
                  </span>
                </div>

                <div className="pipeline-content">
                  <span className="pipeline-stage">
                    COMPLETE
                  </span>

                  <strong>
                    Result available
                  </strong>
                </div>

              </div>

            </div>

          </aside>

        </section>

        {error && (
          <div className="dashboard-error">

            <span className="error-icon">
              !
            </span>

            <span>
              {error}
            </span>

          </div>
        )}

        <section className="jobs-section">

          <div className="jobs-heading">

            <div>

              <span className="page-kicker">
                JOB ACTIVITY
              </span>

              <div className="jobs-title-row">

                <h2>
                  {statusFilter === "ALL"
                    ? "Recent jobs"
                    : statusFilter === "COMPLETED"
                    ? "Completed results"
                    : statusFilter === "FAILED"
                    ? "Failed jobs"
                    : statusFilter === "PENDING"
                    ? "Pending jobs"
                    : "Running jobs"}
                </h2>

                <span className="jobs-count">
                  {filteredJobs.length} of {jobs.length}
                </span>

              </div>

              <p>
                {statusFilter === "COMPLETED"
                  ? "Completed workloads and their returned results."
                  : statusFilter === "FAILED"
                  ? "Workloads that require attention and their returned results."
                  : statusFilter === "PENDING"
                  ? "Workloads waiting for distributed processing."
                  : statusFilter === "RUNNING"
                  ? "Workloads currently being processed by workers."
                  : "Search and monitor workloads submitted to the distributed processing system."}
              </p>

            </div>

          </div>

          <div className="jobs-toolbar">

            <div className="search-box">

              <span className="search-icon">
                /
              </span>

              <input
                id="job-search"
                type="text"
                placeholder="Search by job ID, name, or result..."
                value={jobSearch}
                onChange={(event) =>
                  setJobSearch(
                    event.target.value
                  )
                }
              />

              {jobSearch && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() =>
                    setJobSearch("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}

            </div>

            <div className="status-filters">

              {filterOptions.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={
                    statusFilter === filter.value
                      ? `status-filter active status-filter-${filter.value.toLowerCase()}`
                      : `status-filter status-filter-${filter.value.toLowerCase()}`
                  }
                  onClick={() =>
                    selectMetric(filter.value)
                  }
                >
                  <span
                    className={
                      `filter-status-dot ${getStatusDotClass(
                        filter.value
                      )}`
                    }
                  />

                  <span className="filter-label">
                    {filter.label}
                  </span>

                </button>
              ))}

            </div>

          </div>

          {loading ? (
            <div className="table-state">

              <div className="state-loader" />

              <strong>
                Loading jobs
              </strong>

              <span>
                Retrieving the latest job activity...
              </span>

            </div>
          ) : jobs.length === 0 ? (
            <div className="table-state">

              <div className="state-icon">
                —
              </div>

              <strong>
                No jobs yet
              </strong>

              <span>
                Submit your first job to begin
                monitoring distributed activity.
              </span>

            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="table-state">

              <div className="state-icon">
                ?
              </div>

              <strong>
                No matching jobs
              </strong>

              <span>
                No jobs match the current search
                or status filter.
              </span>

              <button
                type="button"
                className="reset-button"
                onClick={() => {
                  setJobSearch("");
                  setStatusFilter("ALL");
                }}
              >
                Reset filters
              </button>

            </div>
          ) : (
            <div className="jobs-table-card">

              <div className="table-scroll">

                <table>

                  <thead>

                    <tr>

                      <th className="column-id">
                        ID
                      </th>

                      <th className="column-name">
                        Job
                      </th>

                      <th className="column-status">
                        Status
                      </th>

                      <th className="column-date">
                        Created
                      </th>

                      <th className="column-date">
                        Completed
                      </th>

                      <th className="column-result">
                        Result
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="job-row-clickable"
                        onClick={() =>
                          openJobDetails(job)
                        }
                        tabIndex={0}
                        role="button"
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                            openJobDetails(job);
                          }
                        }}
                        aria-label={`Open details for job ${job.id}`}
                      >

                        <td>

                          <span className="table-job-id">
                            #{job.id}
                          </span>

                        </td>

                        <td>

                          <div className="job-cell">

                            <span className="job-name">
                              {job.name}
                            </span>

                            <span className="job-reference">
                              JOB-{String(job.id).padStart(4, "0")}
                            </span>

                          </div>

                        </td>

                        <td>

                          <span
                            className={
                              `status ${getStatusClass(
                                job.status
                              )}`
                            }
                          >
                            <span
                              className={
                                `status-dot ${getStatusDotClass(
                                  job.status
                                )}`
                              }
                            />

                            {job.status}
                          </span>

                        </td>

                        <td>

                          <span className="table-date">
                            {formatDateTime(
                              job.createdAt
                            )}
                          </span>

                        </td>

                        <td>

                          <span className="table-date">
                            {formatDateTime(
                              job.completedAt
                            )}
                          </span>

                        </td>

                        <td>

                          <span className="table-result">
                            {job.result || "-"}
                          </span>

                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

              <div className="table-footer">

                <span>
                  Showing {filteredJobs.length} job
                  {filteredJobs.length === 1
                    ? ""
                    : "s"}
                </span>

                <span>
                  Select a job to inspect details
                </span>

              </div>

            </div>
          )}

        </section>

      </main>

      {selectedJob && (
        <div
          className="job-details-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeJobDetails();
            }
          }}
        >
          <aside
            className="job-details-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-details-title"
          >

            <div className="job-details-header">

              <div>
                <span className="panel-kicker">
                  WORKLOAD INSPECTION
                </span>

                <h2 id="job-details-title">
                  Job details
                </h2>
              </div>

              <button
                type="button"
                className="job-details-close"
                onClick={closeJobDetails}
                aria-label="Close job details"
              >
                ×
              </button>

            </div>

            <div className="job-details-body">

              <div className="job-details-identity">

                <div className="job-details-id">
                  <span>
                    JOB ID
                  </span>

                  <strong>
                    #{selectedJob.id}
                  </strong>
                </div>

                <span
                  className={
                    `status job-details-status ${getStatusClass(
                      selectedJob.status
                    )}`
                  }
                >
                  <span
                    className={
                      `status-dot ${getStatusDotClass(
                        selectedJob.status
                      )}`
                    }
                  />

                  {selectedJob.status}
                </span>

              </div>

              <div className="job-details-name-block">

                <span>
                  JOB NAME
                </span>

                <h3>
                  {selectedJob.name || "Unnamed job"}
                </h3>

                <small>
                  JOB-{String(selectedJob.id).padStart(4, "0")}
                </small>

              </div>

              <div className="job-details-facts">

                <div className="job-detail-fact">

                  <span>
                    CREATED
                  </span>

                  <strong>
                    {formatDateTime(
                      selectedJob.createdAt
                    )}
                  </strong>

                </div>

                <div className="job-detail-fact">

                  <span>
                    COMPLETED
                  </span>

                  <strong>
                    {formatDateTime(
                      selectedJob.completedAt
                    )}
                  </strong>

                </div>

              </div>

              <div className="job-details-section">

                <div className="job-details-section-heading">

                  <span>
                    PROCESSING LIFECYCLE
                  </span>

                  <small>
                    Current workload state
                  </small>

                </div>

                <div className="job-lifecycle">

                  {(() => {
                    const lifecycle =
                      getJobLifecycle(selectedJob);

                    return (
                      <>
                        <div
                          className={
                            lifecycle.submitted
                              ? "lifecycle-step complete"
                              : "lifecycle-step"
                          }
                        >
                          <span className="lifecycle-marker">
                            ✓
                          </span>

                          <div>
                            <strong>
                              Submitted
                            </strong>

                            <small>
                              Request accepted
                            </small>
                          </div>
                        </div>

                        <div
                          className={
                            lifecycle.queued
                              ? "lifecycle-step complete"
                              : "lifecycle-step"
                          }
                        >
                          <span className="lifecycle-marker">
                            {lifecycle.queued
                              ? "✓"
                              : "2"}
                          </span>

                          <div>
                            <strong>
                              Queued
                            </strong>

                            <small>
                              Event entered processing queue
                            </small>
                          </div>
                        </div>

                        <div
                          className={
                            lifecycle.executing
                              ? "lifecycle-step complete"
                              : "lifecycle-step"
                          }
                        >
                          <span className="lifecycle-marker">
                            {lifecycle.executing
                              ? "✓"
                              : "3"}
                          </span>

                          <div>
                            <strong>
                              Processing
                            </strong>

                            <small>
                              Distributed worker execution
                            </small>
                          </div>
                        </div>

                        <div
                          className={
                            lifecycle.completed
                              ? selectedJob.status?.toUpperCase() ===
                                "FAILED"
                                ? "lifecycle-step failed complete"
                                : "lifecycle-step complete"
                              : "lifecycle-step"
                          }
                        >
                          <span className="lifecycle-marker">
                            {lifecycle.completed
                              ? selectedJob.status?.toUpperCase() ===
                                "FAILED"
                                ? "!"
                                : "✓"
                              : "4"}
                          </span>

                          <div>
                            <strong>
                              {selectedJob.status?.toUpperCase() ===
                              "FAILED"
                                ? "Failed"
                                : "Complete"}
                            </strong>

                            <small>
                              {selectedJob.status?.toUpperCase() ===
                              "FAILED"
                                ? "Workload requires attention"
                                : selectedJob.status?.toUpperCase() ===
                                  "COMPLETED"
                                ? "Result returned"
                                : "Awaiting final result"}
                            </small>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                </div>

              </div>

              <div className="job-details-section">

                <div className="job-details-section-heading">

                  <span>
                    EXECUTION RESULT
                  </span>

                  <small>
                    Returned by the processing system
                  </small>

                </div>

                <div
                  className={
                    selectedJob.status?.toUpperCase() ===
                    "FAILED"
                      ? "job-result-box failed"
                      : "job-result-box"
                  }
                >
                  {selectedJob.result ? (
                    <pre>
                      {selectedJob.result}
                    </pre>
                  ) : (
                    <span className="job-result-empty">
                      No result is available for this
                      workload yet.
                    </span>
                  )}
                </div>

              </div>

            </div>

            <div className="job-details-footer">

              <span>
                Live data refreshes automatically
              </span>

              <button
                type="button"
                className="job-details-done"
                onClick={closeJobDetails}
              >
                Close details
              </button>

            </div>

          </aside>
        </div>
      )}

    </div>
  );
}

export default App;