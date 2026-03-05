import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Circle,
  Edit3,
  ExternalLink,
  RotateCcw,
  X,
} from "lucide-react";

type CandidateStatus = "pending" | "approved" | "rejected";
type CandidateConfidence = "high" | "medium" | "low";
type ConfidenceFilter = "all" | "high" | "medium-plus";
type CandidateAction = "scraped" | "edited" | "approved" | "rejected" | "undone";
type RejectReason =
  | "Wrong category"
  | "Not premium enough"
  | "Duplicate"
  | "Insufficient information";

interface AuditEntry {
  id: string;
  action: CandidateAction;
  userName: string;
  timestamp: string;
  note?: string;
}

interface TrendCandidate {
  _key: string;
  name: string;
  content_type: "venue" | "travel" | "experience";
  category: string;
  location: string;
  description: string;
  signal_phrase: string;
  confidence: CandidateConfidence;
  source_name: string;
  source_url: string;
  status: CandidateStatus;
  scraped_at: string;
  edited: boolean;
  auditLog: AuditEntry[];
}

const ASSISTANTS = [
  "Brooke",
  "Caitlin",
  "Charlotte",
  "Charlee",
  "Cordelia",
  "Eve",
  "Fernando",
  "Georgia",
  "Josh",
  "Kate",
  "Lily",
  "Mimi",
  "Nicole",
  "Oceane",
  "Saule",
] as const;

const REJECT_REASONS: RejectReason[] = [
  "Wrong category",
  "Not premium enough",
  "Duplicate",
  "Insufficient information",
];

const MOCK_CANDIDATES: TrendCandidate[] = [
  {
    _key: "trend-rosewood-milan",
    name: "Rosewood Milan",
    content_type: "venue",
    category: "staying_in",
    location: "Milan, Italy",
    description:
      "Twin 19th-century palazzi are being transformed into Rosewood Milan with a courtyard restaurant and private wellness club.",
    signal_phrase:
      "Two 19th-century palazzi will house Rosewood's first property in Milan with a private members-style wellness concept.",
    confidence: "high",
    source_name: "Condé Nast Traveller",
    source_url: "https://www.cntraveller.com",
    status: "pending",
    scraped_at: "2026-03-04T09:00:00.000Z",
    edited: false,
    auditLog: [],
  },
  {
    _key: "trend-the-nudge-rome-jazz",
    name: "Late-Night Jazz Supper at Hotel Locarno",
    content_type: "experience",
    category: "dining",
    location: "Rome, Italy",
    description:
      "A new members-first supper series pairing regional menus with rotating jazz residencies in a private courtyard.",
    signal_phrase:
      "A local-favourite hotel has launched invitation-only jazz suppers with rotating chefs and hard-to-book tables.",
    confidence: "medium",
    source_name: "The Nudge",
    source_url: "https://thenudge.com",
    status: "pending",
    scraped_at: "2026-03-03T20:24:00.000Z",
    edited: false,
    auditLog: [],
  },
  {
    _key: "trend-six-senses-seoul",
    name: "Six Senses Seoul",
    content_type: "travel",
    category: "staying_in",
    location: "Seoul, South Korea",
    description:
      "Six Senses has announced a wellness-led urban opening in Seoul focused on sleep programming and longevity diagnostics.",
    signal_phrase:
      "The upcoming Six Senses Seoul is leaning heavily into biohacking and sleep optimisation.",
    confidence: "high",
    source_name: "Travel Weekly",
    source_url: "https://travelweekly.com",
    status: "approved",
    scraped_at: "2026-02-28T11:04:00.000Z",
    edited: true,
    auditLog: [
      {
        id: "audit-1",
        action: "edited",
        userName: "Nicole",
        timestamp: "2026-03-02T10:17:00.000Z",
        note: "Tightened description for tone.",
      },
      {
        id: "audit-2",
        action: "approved",
        userName: "Nicole",
        timestamp: "2026-03-02T10:18:00.000Z",
      },
    ],
  },
  {
    _key: "trend-dublin-immersive",
    name: "After-Hours Book of Kells Access",
    content_type: "experience",
    category: "culture",
    location: "Dublin, Ireland",
    description:
      "A premium after-hours visit with private curator walkthroughs and champagne reception has launched this spring.",
    signal_phrase:
      "The university now offers late evening private access with curator-led insights and hospitality add-ons.",
    confidence: "low",
    source_name: "Condé Nast Traveller",
    source_url: "https://www.cntraveller.com",
    status: "rejected",
    scraped_at: "2026-02-27T16:10:00.000Z",
    edited: false,
    auditLog: [
      {
        id: "audit-3",
        action: "rejected",
        userName: "Georgia",
        timestamp: "2026-03-01T12:23:00.000Z",
        note: "Insufficient information",
      },
    ],
  },
];

function createAuditEntry(
  action: CandidateAction,
  userName: string,
  note?: string,
): AuditEntry {
  return {
    id: `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    userName,
    timestamp: new Date().toISOString(),
    note,
  };
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAction(action: CandidateAction): string {
  if (action === "scraped") return "Scraped";
  if (action === "edited") return "Edited";
  if (action === "approved") return "Approved";
  if (action === "rejected") return "Rejected";
  return "Undone";
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confidenceClass(confidence: CandidateConfidence): string {
  if (confidence === "high") return "bg-[#E8F4EA] text-[#2F7A42] border-[#CFE7D4]";
  if (confidence === "medium") return "bg-[#FFF7D1] text-[#7B6514] border-[#F0D76D]";
  return "bg-[#EFEDE9] text-[#6B6865] border-[#DED9D2]";
}

function statusClass(status: CandidateStatus): string {
  if (status === "approved") return "bg-[#E8F4EA] text-[#2F7A42] border-[#CFE7D4]";
  if (status === "rejected") return "bg-[#FAECE9] text-[#9D3E31] border-[#E8C3BB]";
  return "bg-[#FFF7D1] text-[#7B6514] border-[#F0D76D]";
}

function activityDotClass(action: CandidateAction): string {
  if (action === "approved") return "bg-[#5BA95F]";
  if (action === "rejected") return "bg-[#C0564A]";
  if (action === "undone") return "bg-[#9B9792]";
  return "bg-[#E7C51C]";
}

function applyDescriptionEdit(
  candidate: TrendCandidate,
  draftDescription: string,
  activeUser: string,
): TrendCandidate {
  const cleanedDraft = draftDescription.trim();
  const cleanedCurrent = candidate.description.trim();
  if (!cleanedDraft || cleanedDraft === cleanedCurrent) {
    return candidate;
  }

  const editLog = createAuditEntry("edited", activeUser, "Description updated");
  return {
    ...candidate,
    description: cleanedDraft,
    edited: true,
    auditLog: [editLog, ...candidate.auditLog],
  };
}

export default function TrendInbox() {
  const [candidates, setCandidates] = useState<TrendCandidate[]>(() =>
    MOCK_CANDIDATES.map((candidate) => ({
      ...candidate,
      auditLog: candidate.auditLog.length
        ? candidate.auditLog
        : [
            {
              id: `scraped-${candidate._key}`,
              action: "scraped",
              userName: "System",
              timestamp: candidate.scraped_at,
            },
          ],
    })),
  );
  const [activeUser, setActiveUser] = useState<string>(ASSISTANTS[0]);
  const [statusFilter, setStatusFilter] = useState<"all" | CandidateStatus>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "venue" | "travel" | "experience">("all");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [showRejectDrawer, setShowRejectDrawer] = useState(false);
  const [rejectReason, setRejectReason] = useState<RejectReason>(REJECT_REASONS[0]);

  const sourceOptions = useMemo(() => {
    return Array.from(new Set(candidates.map((candidate) => candidate.source_name))).sort();
  }, [candidates]);

  const counts = useMemo(
    () => ({
      pending: candidates.filter((candidate) => candidate.status === "pending").length,
      approved: candidates.filter((candidate) => candidate.status === "approved").length,
      rejected: candidates.filter((candidate) => candidate.status === "rejected").length,
    }),
    [candidates],
  );

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      if (statusFilter !== "all" && candidate.status !== statusFilter) return false;
      if (sourceFilter !== "all" && candidate.source_name !== sourceFilter) return false;
      if (typeFilter !== "all" && candidate.content_type !== typeFilter) return false;
      if (confidenceFilter === "high" && candidate.confidence !== "high") return false;
      if (
        confidenceFilter === "medium-plus" &&
        candidate.confidence !== "high" &&
        candidate.confidence !== "medium"
      ) {
        return false;
      }
      return true;
    });
  }, [candidates, statusFilter, sourceFilter, typeFilter, confidenceFilter]);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate._key === selectedKey) ?? null,
    [candidates, selectedKey],
  );

  useEffect(() => {
    setSelectedKey(null);
  }, [statusFilter, sourceFilter, typeFilter, confidenceFilter]);

  useEffect(() => {
    if (!selectedCandidate) {
      setIsEditingDescription(false);
      setDescriptionDraft("");
      setShowRejectDrawer(false);
      setRejectReason(REJECT_REASONS[0]);
      return;
    }

    setDescriptionDraft(selectedCandidate.description);
    setIsEditingDescription(false);
    setShowRejectDrawer(false);
    setRejectReason(REJECT_REASONS[0]);
  }, [selectedCandidate?._key]);

  const setStatus = (key: string, status: CandidateStatus, note?: string) => {
    setCandidates((prev) =>
      prev.map((candidate) => {
        if (candidate._key !== key) return candidate;
        const log = createAuditEntry(status === "approved" ? "approved" : "rejected", activeUser, note);
        return {
          ...candidate,
          status,
          auditLog: [log, ...candidate.auditLog],
        };
      }),
    );
  };

  const handleSaveEdits = () => {
    if (!selectedCandidate) return;

    setCandidates((prev) =>
      prev.map((candidate) => {
        if (candidate._key !== selectedCandidate._key) return candidate;
        return applyDescriptionEdit(candidate, descriptionDraft, activeUser);
      }),
    );
    setIsEditingDescription(false);
  };

  const handleApprove = (key: string) => {
    setCandidates((prev) =>
      prev.map((candidate) => {
        if (candidate._key !== key) return candidate;

        let updated = candidate;
        if (candidate._key === selectedKey) {
          updated = applyDescriptionEdit(updated, descriptionDraft, activeUser);
        }
        if (updated.status === "approved") return updated;

        const log = createAuditEntry("approved", activeUser);
        return {
          ...updated,
          status: "approved",
          auditLog: [log, ...updated.auditLog],
        };
      }),
    );
    setShowRejectDrawer(false);
    setIsEditingDescription(false);
  };

  const handleReject = (key: string) => {
    setStatus(key, "rejected", rejectReason);
    setShowRejectDrawer(false);
    setIsEditingDescription(false);
  };

  const handleUndo = (key: string) => {
    setCandidates((prev) =>
      prev.map((candidate) => {
        if (candidate._key !== key) return candidate;
        const log = createAuditEntry("undone", activeUser);
        return {
          ...candidate,
          status: "pending",
          auditLog: [log, ...candidate.auditLog],
        };
      }),
    );
  };

  return (
    <div className="min-h-screen bg-[#E8E5E0] text-[#0A0A0A]">
      <div className="mx-auto w-full max-w-[1540px] px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#4A4743] hover:text-[#1D1C1B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Tools
        </Link>

        <section className="rounded-xl border border-[#D8D2CB] bg-[#FAFAF8]/95 backdrop-blur-sm px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <h1 className="text-[28px] font-semibold leading-none text-[#0A0A0A]">Trend Inbox</h1>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E6CF66] bg-[#FFF7D1] px-3 py-1 text-[#7B6514]">
                  <Circle className="h-2.5 w-2.5 fill-current text-[#E7C51C]" />
                  {counts.pending} Pending
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE7D4] bg-[#E8F4EA] px-3 py-1 text-[#2F7A42]">
                  <Circle className="h-2.5 w-2.5 fill-current text-[#5BA95F]" />
                  {counts.approved} Approved
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8C3BB] bg-[#FAECE9] px-3 py-1 text-[#9D3E31]">
                  <Circle className="h-2.5 w-2.5 fill-current text-[#C0564A]" />
                  {counts.rejected} Rejected
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | CandidateStatus)}
                className="rounded-full border border-[#D5CFC8] bg-white px-3 py-2 text-xs font-medium text-[#1D1C1B] outline-none transition focus:border-[#C8AA12] focus:ring-2 focus:ring-[#E7C51C]/40"
              >
                <option value="all">Status: All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
                className="rounded-full border border-[#D5CFC8] bg-white px-3 py-2 text-xs font-medium text-[#1D1C1B] outline-none transition focus:border-[#C8AA12] focus:ring-2 focus:ring-[#E7C51C]/40"
              >
                <option value="all">Source: All sources</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "all" | "venue" | "travel" | "experience")
                }
                className="rounded-full border border-[#D5CFC8] bg-white px-3 py-2 text-xs font-medium text-[#1D1C1B] outline-none transition focus:border-[#C8AA12] focus:ring-2 focus:ring-[#E7C51C]/40"
              >
                <option value="all">Type: All types</option>
                <option value="venue">Venue</option>
                <option value="travel">Travel</option>
                <option value="experience">Experience</option>
              </select>
              <select
                value={confidenceFilter}
                onChange={(event) => setConfidenceFilter(event.target.value as ConfidenceFilter)}
                className="rounded-full border border-[#D5CFC8] bg-white px-3 py-2 text-xs font-medium text-[#1D1C1B] outline-none transition focus:border-[#C8AA12] focus:ring-2 focus:ring-[#E7C51C]/40"
              >
                <option value="all">Confidence: All</option>
                <option value="high">High only</option>
                <option value="medium-plus">Medium+</option>
              </select>
              <select
                value={activeUser}
                onChange={(event) => setActiveUser(event.target.value)}
                className="rounded-full border border-[#D5CFC8] bg-white px-3 py-2 text-xs font-semibold text-[#1D1C1B] outline-none transition focus:border-[#C8AA12] focus:ring-2 focus:ring-[#E7C51C]/40"
              >
                {ASSISTANTS.map((assistant) => (
                  <option key={assistant} value={assistant}>
                    {assistant}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mt-4 grid h-[calc(100vh-190px)] min-h-[560px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex h-full flex-col rounded-xl border border-[#D8D2CB] bg-[#FAFAF8]/95 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5E1DB] px-4 py-3">
              <p className="text-sm font-semibold text-[#1D1C1B]">Candidates</p>
              <p className="text-xs text-[#6B6865]">{filteredCandidates.length} items</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {filteredCandidates.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#D7D1CB] bg-white/70 p-6 text-center text-sm text-[#6B6865]">
                  No candidates match these filters.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredCandidates.map((candidate) => {
                    const isSelected = candidate._key === selectedKey;
                    return (
                      <button
                        key={candidate._key}
                        type="button"
                        onClick={() => setSelectedKey(candidate._key)}
                        className={`group relative w-full rounded-xl border p-4 text-left transition ${
                          isSelected
                            ? "border-[#E7C51C] bg-[#FFFBE8] shadow-sm"
                            : "border-[#DDD7D0] bg-white/95 hover:border-[#CFC8C0]"
                        } ${
                          candidate.status === "approved"
                            ? "opacity-55"
                            : candidate.status === "rejected"
                              ? "opacity-45"
                              : "opacity-100"
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold leading-tight text-[#0A0A0A]">{candidate.name}</p>
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#6B6865]">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              {candidate.location}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${confidenceClass(candidate.confidence)}`}
                          >
                            {candidate.confidence}
                          </span>
                        </div>

                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full border border-[#DFD8D0] bg-[#F7F4EF] px-2 py-0.5 text-[11px] font-medium text-[#4A4743]">
                            {formatLabel(candidate.content_type)}
                          </span>
                          <span className="rounded-full border border-[#DFD8D0] bg-[#F7F4EF] px-2 py-0.5 text-[11px] font-medium text-[#4A4743]">
                            {formatLabel(candidate.category)}
                          </span>
                          <span className="rounded-full border border-[#DFD8D0] bg-[#F7F4EF] px-2 py-0.5 text-[11px] font-medium text-[#4A4743]">
                            {candidate.source_name}
                          </span>
                          {candidate.edited && (
                            <span className="rounded-full border border-[#E6CF66] bg-[#FFF7D1] px-2 py-0.5 text-[11px] font-medium text-[#7B6514]">
                              Edited
                            </span>
                          )}
                          {candidate.status !== "pending" && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusClass(candidate.status)}`}
                            >
                              {candidate.status}
                            </span>
                          )}
                        </div>

                        <p className="line-clamp-2 text-xs italic leading-relaxed text-[#6B6865]">
                          {candidate.signal_phrase}
                        </p>

                        {candidate.status === "pending" && (
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleApprove(candidate._key);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#CFE7D4] bg-[#E8F4EA] text-[#2F7A42] hover:bg-[#DAEEDF]"
                              aria-label={`Approve ${candidate.name}`}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedKey(candidate._key);
                                setShowRejectDrawer(true);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E8C3BB] bg-[#FAECE9] text-[#9D3E31] hover:bg-[#F3DBD5]"
                              aria-label={`Reject ${candidate.name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="flex h-full flex-col rounded-xl border border-[#D8D2CB] bg-[#FAFAF8]/95 backdrop-blur-sm shadow-sm">
            {!selectedCandidate ? (
              <div className="flex h-full items-center justify-center px-8 text-center text-sm text-[#6B6865]">
                Select a candidate to review details
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <div className="space-y-5">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border border-[#DFD8D0] bg-[#F7F4EF] px-2 py-0.5 text-[11px] font-medium text-[#4A4743]">
                          {formatLabel(selectedCandidate.content_type)}
                        </span>
                        <span className="rounded-full border border-[#DFD8D0] bg-[#F7F4EF] px-2 py-0.5 text-[11px] font-medium text-[#4A4743]">
                          {formatLabel(selectedCandidate.category)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${confidenceClass(selectedCandidate.confidence)}`}
                        >
                          {selectedCandidate.confidence}
                        </span>
                        <span className="rounded-full border border-[#DFD8D0] bg-[#F7F4EF] px-2 py-0.5 text-[11px] font-medium text-[#4A4743]">
                          {selectedCandidate.source_name}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusClass(selectedCandidate.status)}`}
                        >
                          {selectedCandidate.status}
                        </span>
                      </div>
                      <h2 className="text-2xl font-semibold leading-tight text-[#0A0A0A]">
                        {selectedCandidate.name}
                      </h2>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#6B6865]">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {selectedCandidate.location}
                      </p>
                    </div>

                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6B6865]">
                          Editorial Description
                        </h3>
                        {isEditingDescription && (
                          <span className="text-[11px] text-[#7D7A76]">
                            Editing as {activeUser} · Changes logged on approval
                          </span>
                        )}
                      </div>
                      {isEditingDescription ? (
                        <div className="space-y-2">
                          <textarea
                            value={descriptionDraft}
                            onChange={(event) => setDescriptionDraft(event.target.value)}
                            rows={5}
                            className="w-full rounded-lg border border-[#D8D2CB] bg-white px-3 py-2 text-sm leading-relaxed text-[#1D1C1B] outline-none transition focus:border-[#C8AA12] focus:ring-2 focus:ring-[#E7C51C]/40"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSaveEdits}
                              className="rounded-lg border border-[#D6BB1B] bg-[#E7C51C] px-3 py-1.5 text-xs font-semibold text-[#232220] hover:bg-[#D7B716]"
                            >
                              Save Edits
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDescriptionDraft(selectedCandidate.description);
                                setIsEditingDescription(false);
                              }}
                              className="rounded-lg border border-[#D8D2CB] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A3835] hover:bg-[#F3F1EC]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed text-[#3A3835]">
                          {selectedCandidate.description}
                        </p>
                      )}
                    </section>

                    <section className="rounded-lg border-l-4 border-[#E7C51C] bg-[#FFF9DE] px-3 py-2">
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#7B6514]">
                        Signal Phrase
                      </h3>
                      <p className="text-sm italic leading-relaxed text-[#5A554F]">
                        {selectedCandidate.signal_phrase}
                      </p>
                    </section>

                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B6865]">
                        Metadata
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-[#E3DED8] bg-white px-3 py-2">
                          <p className="text-[#7D7A76]">Type</p>
                          <p className="mt-0.5 font-medium text-[#1D1C1B]">
                            {formatLabel(selectedCandidate.content_type)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-[#E3DED8] bg-white px-3 py-2">
                          <p className="text-[#7D7A76]">Category</p>
                          <p className="mt-0.5 font-medium text-[#1D1C1B]">
                            {formatLabel(selectedCandidate.category)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-[#E3DED8] bg-white px-3 py-2">
                          <p className="text-[#7D7A76]">Location</p>
                          <p className="mt-0.5 font-medium text-[#1D1C1B]">{selectedCandidate.location}</p>
                        </div>
                        <div className="rounded-lg border border-[#E3DED8] bg-white px-3 py-2">
                          <p className="text-[#7D7A76]">Source</p>
                          <p className="mt-0.5 font-medium text-[#1D1C1B]">{selectedCandidate.source_name}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B6865]">
                        Source URL
                      </h3>
                      <a
                        href={selectedCandidate.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 break-all text-xs text-[#6B6865] underline underline-offset-2 hover:text-[#1D1C1B]"
                      >
                        {selectedCandidate.source_url}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    </section>

                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B6865]">
                        Activity Log
                      </h3>
                      <div className="space-y-1.5">
                        {selectedCandidate.auditLog.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start gap-2 rounded-lg border border-[#E3DED8] bg-white px-2.5 py-2 text-xs"
                          >
                            <span
                              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${activityDotClass(entry.action)}`}
                            />
                            <p className="leading-relaxed text-[#3A3835]">
                              <span className="font-semibold">{entry.userName}</span> {formatAction(entry.action)}
                              {entry.note ? ` - ${entry.note}` : ""} ·{" "}
                              <span className="text-[#7D7A76]">{formatTimestamp(entry.timestamp)}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                <div className="sticky bottom-0 space-y-2 border-t border-[#E5E1DB] bg-[#FAFAF8] px-5 py-4">
                  {selectedCandidate.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedCandidate._key)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#D6BB1B] bg-[#E7C51C] px-3 py-2.5 text-sm font-semibold text-[#232220] hover:bg-[#D7B716]"
                      >
                        <Check className="h-4 w-4" />
                        Approve & Add to Recommendations
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingDescription((prev) => !prev)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D8D2CB] bg-white px-3 py-2 text-sm font-semibold text-[#3A3835] hover:bg-[#F3F1EC]"
                        >
                          <Edit3 className="h-4 w-4" />
                          {isEditingDescription ? "Stop Editing" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRejectDrawer((prev) => !prev)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E8C3BB] bg-[#FAECE9] px-3 py-2 text-sm font-semibold text-[#9D3E31] hover:bg-[#F3DBD5]"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      </div>

                      {showRejectDrawer && (
                        <div className="rounded-lg border border-[#E3DED8] bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B6865]">
                            Reject reason
                          </p>
                          <div className="space-y-1.5">
                            {REJECT_REASONS.map((reason) => (
                              <label
                                key={reason}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs text-[#3A3835] hover:bg-[#F5F2ED]"
                              >
                                <input
                                  type="radio"
                                  name="reject-reason"
                                  checked={rejectReason === reason}
                                  onChange={() => setRejectReason(reason)}
                                  className="h-3.5 w-3.5 accent-[#C0564A]"
                                />
                                {reason}
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReject(selectedCandidate._key)}
                            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-[#B54A3E] bg-[#C0564A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#A3473D]"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div
                        className={`inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${statusClass(selectedCandidate.status)}`}
                      >
                        {selectedCandidate.status}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndo(selectedCandidate._key)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#D8D2CB] bg-white px-3 py-2 text-sm font-semibold text-[#3A3835] hover:bg-[#F3F1EC]"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Undo
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
