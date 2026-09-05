import "./App.css";
import { useEffect, useState } from "react";

const API_URL = "/api/jobs";

function App() {
  const [jobs, setJobs] = useState([]);
  const [jobName, setJobName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadJobs = async () => {
    try {
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        const responseText = await response.text();

        throw new Error(
          `Failed to load jobs. HTTP ${response.status}: ${responseText}`
        );
      }

      const data = await response.json();
      setJobs(data);
    } catch (err) {
      console.error("LOAD JOBS ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createJob = async (event) => {
    event.preventDefault();

    if (!jobName.trim()) {
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: jobName.trim(),
        }),
      });

      const responseText = await response.text();

      console.log("CREATE JOB STATUS:", response.status);
      console.log("CREATE JOB RESPONSE:", responseText);

      if (!response.ok) {
        throw new Error(
          `Failed to create job. HTTP ${response.status}: ${responseText}`
        );
      }

      setJobName("");

      await loadJobs();
    } catch (err) {
      console.error("CREATE JOB ERROR:", err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadJobs();

    const interval = setInterval(loadJobs, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusClass = (status) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return "status-completed";

      case "FAILED":
        return "status-failed";

      case "PROCESSING":
        return "status-processing";

      case "PENDING":
        return "status-pending";

      default:
        return "";
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Distributed Job Platform</h1>

          <p>Monitor and submit distributed jobs</p>
        </div>

        <button
          className="refresh-button"
          onClick={loadJobs}
        >
          Refresh
        </button>
      </header>

      <main className="container">
        <section className="create-card">
          <h2>Create New Job</h2>

          <form
            onSubmit={createJob}
            className="job-form"
          >
            <input
              type="text"
              placeholder="Enter job name"
              value={jobName}
              onChange={(event) =>
                setJobName(event.target.value)
              }
              disabled={creating}
            />

            <button
              type="submit"
              disabled={
                creating ||
                !jobName.trim()
              }
            >
              {creating
                ? "Creating..."
                : "Create Job"}
            </button>
          </form>
        </section>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <section className="jobs-section">
          <div className="section-header">
            <h2>Jobs</h2>

            <span>
              {jobs.length} total
            </span>
          </div>

          {loading ? (
            <div className="message">
              Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="message">
              No jobs found.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Completed</th>
                    <th>Result</th>
                  </tr>
                </thead>

                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        #{job.id}
                      </td>

                      <td className="job-name">
                        {job.name}
                      </td>

                      <td>
                        <span
                          className={`status ${getStatusClass(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td>
                        {job.createdAt
                          ? new Date(
                              job.createdAt
                            ).toLocaleString()
                          : "-"}
                      </td>

                      <td>
                        {job.completedAt
                          ? new Date(
                              job.completedAt
                            ).toLocaleString()
                          : "-"}
                      </td>

                      <td className="result">
                        {job.result || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;




