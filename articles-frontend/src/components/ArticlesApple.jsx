import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import api from "../api";
import "./ArticlesApple.css";

export default function ArticlesApple() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [mode, setMode] = useState("side");

  useEffect(() => {
    api.get("/articles")
      .then(res => setArticles(res.data))
      .finally(() => setLoading(false));
  }, []);

  const copy = async (text) => {
    await navigator.clipboard.writeText(text);
    alert("Copied updated content");
  };

  if (loading) {
    return <div className="app-loading">Loading articles…</div>;
  }

  return (
    <main className="apple-root">
      <header className="apple-header">
        <div className="brand">
          <div className="logo"></div>
          <div>
            <h1 className="site-title">Article Studio</h1>
            <p className="site-sub">Original · AI Updated · References</p>
          </div>
        </div>

        <div className="toggle-group">
          <button
            className={mode === "side" ? "active" : ""}
            onClick={() => setMode("side")}
          >
            Side
          </button>
          <button
            className={mode === "stack" ? "active" : ""}
            onClick={() => setMode("stack")}
          >
            Stack
          </button>
        </div>
      </header>

      <section className="content-area">
        {articles.map(a => {
          const open = expandedId === a.id;

          return (
            <article className="apple-card" key={a.id}>
              <div className="card-top">
                <div>
                  <h2 className="article-title">{a.title}</h2>
                  <p className="meta">
                    Status: <strong>{a.is_updated ? "Updated" : "Original"}</strong>
                    {" · "}
                    <a href={a.original_url} target="_blank" rel="noreferrer">
                      Source
                    </a>
                  </p>
                </div>

                <button
                  className="btn-pill subtle"
                  onClick={() => setExpandedId(open ? null : a.id)}
                >
                  {open ? "Hide details" : "View details"}
                </button>
              </div>

              <div className={`card-body ${open ? "expanded" : ""}`}>
                <div className={`compare-wrapper ${mode}`}>
                  {/* ORIGINAL */}
                  <section className="pane original-pane">
                    <div className="pane-header">
                      <span className="pane-title">Original</span>
                      <span className="pane-sub">Source text</span>
                    </div>
                    <div className="pane-content original-text">
                      <ReactMarkdown>{a.original_content}</ReactMarkdown>
                    </div>
                  </section>

                  {/* UPDATED */}
                  <section className="pane updated-pane">
                    <div className="pane-header">
                      <div>
                        <span className="pane-title updated-title">Updated</span>
                        <span className="pane-sub">AI-enhanced</span>
                      </div>

                      <div className="pane-controls">
                        <button
                          className="icon-btn"
                          title="Copy"
                          onClick={() => copy(a.updated_content)}
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    <div className="pane-content updated-content">
                      <ReactMarkdown>{a.updated_content}</ReactMarkdown>
                    </div>
                  </section>
                </div>

                {a.citation_links?.length > 0 && (
                  <div className="refs">
                    <span className="refs-label">REFERENCES</span>
                    <div className="refs-list">
                      {a.citation_links.map((link, i) => {
                        const domain = new URL(link).hostname.replace("www.", "");
                        return (
                          <a
                            key={i}
                            className="ref-chip"
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            🌐 {domain} ↗
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
