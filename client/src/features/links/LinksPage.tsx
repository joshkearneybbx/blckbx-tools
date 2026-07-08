import { useState } from "react";
import "./links.css";

type LinksTab = "upload" | "archive";

const TABS: Array<{ id: LinksTab; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "archive", label: "Archive" },
];

export default function LinksPage() {
  const [activeTab, setActiveTab] = useState<LinksTab>("upload");

  return (
    <div className="links-tool">
      <div className="links-shell">
        <header className="links-header">
          <p className="links-preheading">LINKS</p>
          <h1 className="links-title" data-testid="links-page-title">Links Library</h1>
          <p className="links-intro">
            Upload and archive client links. This shell is ready for the Links API integration.
          </p>
        </header>

        <section className="links-tabs" aria-label="Links views">
          <div className="links-tab-list" role="tablist" aria-label="Links views">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`links-${tab.id}-panel`}
                id={`links-${tab.id}-tab`}
                className={`links-tab${activeTab === tab.id ? " is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "upload" ? (
            <div
              id="links-upload-panel"
              role="tabpanel"
              aria-labelledby="links-upload-tab"
              className="links-placeholder"
              aria-label="Upload placeholder"
              data-testid="links-upload-placeholder"
            />
          ) : (
            <div
              id="links-archive-panel"
              role="tabpanel"
              aria-labelledby="links-archive-tab"
              className="links-placeholder"
              aria-label="Archive placeholder"
              data-testid="links-archive-placeholder"
            />
          )}
        </section>
      </div>
    </div>
  );
}
