import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import DiffMatchPatch from "diff-match-patch";
import api from "../api";
import "./ArticlesWorkspace.css";

const dmp = new DiffMatchPatch();

export default function ArticlesWorkspace() {
  const [articles, setArticles] = useState([]);
  const [active, setActive] = useState(null);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    api.get("/articles").then(res => {
      setArticles(res.data);
      setActive(res.data[0]);
    });
  }, []);

  if (!active) return null;

  const stats = {
    total: articles.length,
    updated: articles.filter(a => a.is_updated).length,
    pending: articles.filter(a => !a.is_updated).length,
  };

  function renderDiff(original, updated) {
    const diffs = dmp.diff_main(original || "", updated || "");
    dmp.diff_cleanupSemantic(diffs);

    return diffs.map((part, i) => {
      if (part[0] === 1)
        return (
          <span key={i} className="diff-added">
            {part[1]}
          </span>
        );
      if (part[0] === -1)
        return (
          <span key={i} className="diff-removed">
            {part[1]}
          </span>
        );
      return <span key={i}>{part[1]}</span>;
    });
  }

  return (
    <div className="workspace-root">
      {/* LEFT PANEL */}
      <aside className="workspace-left">
        <h2 className="workspace-title">Your Workspace</h2>

        <div className="stats-row">
          <Stat label="Total" value={stats.total} />
          <Stat label="Updated" value={stats.updated} />
          <Stat label="Pending" value={stats.pending} />
        </div>

        <div className="library">
          {articles.map(a => (
            <button
              key={a.id}
              className={`library-card ${a.id === active.id ? "active" : ""}`}
              onClick={() => {
                setActive(a);
                setShowDiff(false);
              }}
            >
              <h4>{a.title}</h4>
              <p>
                {a.is_updated ? "🟢 Processed" : "🟡 Pending"} •{" "}
                {new URL(a.original_url).hostname}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <main className="workspace-right">
        <header className="editor-header">
          <h1>{active.title}</h1>

          <button
            className="diff-toggle-btn"
            onClick={() => setShowDiff(v => !v)}
          >
            {showDiff ? "Hide changes" : "Show changes"}
          </button>
        </header>

        <div className="editor-grid">
          {/* ORIGINAL */}
          <section className="editor original">
            <h3>Original</h3>
            <ReactMarkdown>{active.original_content}</ReactMarkdown>
          </section>

          {/* UPDATED */}
          <section className="editor updated">
            <h3>Updated</h3>

            {showDiff ? (
              <div className="diff-view">
                {renderDiff(
                  active.original_content,
                  active.updated_content
                )}
              </div>
            ) : (
              <ReactMarkdown>{active.updated_content}</ReactMarkdown>
            )}
          </section>
        </div>

        {active.citation_links && (
          <div className="refs">
            <h4>References</h4>
            {active.citation_links.map((l, i) => (
              <a key={i} href={l} target="_blank" rel="noreferrer">
                {new URL(l).hostname}
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
