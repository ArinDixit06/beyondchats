import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import api from "../api";
import "./Articles.css";

function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api.get("/articles")
      .then((res) => setArticles(res.data))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Updated content copied!");
  };

  if (loading) return <p className="loading">Loading articles…</p>;

  return (
    <div className="container">
      <h1 className="page-title">Articles</h1>

      {articles.map((a) => (
        <div className="card" key={a.id}>
          <div className="card-header">
            <h2>{a.title}</h2>
            <span className={a.is_updated ? "badge updated" : "badge"}>
              {a.is_updated ? "Updated" : "Original"}
            </span>
          </div>

          <button className="toggle-btn" onClick={() => toggle(a.id)}>
            {expanded[a.id] ? "Hide Details ▲" : "View Details ▼"}
          </button>

          {expanded[a.id] && (
            <div className="content">
              {/* ORIGINAL CONTENT */}
              <section className="original">
                <p className="section-label">ORIGINAL CONTENT</p>
                <p className="muted">{a.original_content}</p>
              </section>

              {/* UPDATED CONTENT */}
              {a.updated_content && (
                <section className="updated-box">
                  <div className="updated-header">
                    <p className="section-label highlight">
                      UPDATED CONTENT
                    </p>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(a.updated_content)}
                    >
                      📋 Copy
                    </button>
                  </div>

                  <ReactMarkdown>{a.updated_content}</ReactMarkdown>
                </section>
              )}

              {/* REFERENCES */}
              {a.citation_links && (
                <section>
                  <p className="section-label">REFERENCES</p>
                  <div className="links">
                    {a.citation_links.map((link, i) => {
                      const domain = new URL(link).hostname.replace(
                        "www.",
                        ""
                      );
                      return (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="link-chip"
                        >
                          🌐 {domain} ↗
                        </a>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Articles;
