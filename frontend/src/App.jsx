import { useState, useRef, useCallback, useEffect } from "react";

const API_URL = "http://127.0.0.1:8000/generate";
const ALLOWED_EXT = [".pdf",".docx",".pptx",".txt",".png",".jpg",".jpeg",".bmp",".tiff"];
const MAX_SIZE_MB  = 20;
const HISTORY_KEY  = "quizforge_history";
const MAX_HISTORY  = 20;

// ── ICONS ─────────────────────────────────────────────────
const IconUpload   = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IconMoon     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;
const IconSun      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IconFile     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconX        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconCopy     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const IconCheck    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;
const IconDownload = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconSparkle  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>;
const IconHistory  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconTrash    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconTarget   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>;
const IconCheckCircle = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 15.5 9.5"/></svg>;
const IconPencil   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>;
const IconHelp     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 1.7-2 3.3"/><line x1="12" y1="16.5" x2="12" y2="16.5"/></svg>;

// ── HISTORY HELPERS ───────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveHistory(items) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); }
  catch {}
}

// ── PARSER ────────────────────────────────────────────────
function parseSections(raw) {
  const parts = raw.split(/─{5,}/).map(p => p.trim()).filter(Boolean);
  const sections = [];
  for (const part of parts) {
    const titleMatch = part.match(/^\[?\s*([^\]\n]+)\s*\]?\s*\n/);
    const rawTitle   = part.match(/\[\s*([^\]]+)\s*\]/);
    const title      = rawTitle ? rawTitle[1].trim() : (titleMatch ? titleMatch[1].trim() : "Questions");
    const content    = part.replace(/\[\s*[^\]]+\s*\]/, "").trim();
    if (content.length > 10) sections.push({ title, content });
  }
  return sections.length ? sections : [{ title: "Questions", content: raw.trim() }];
}

function splitQuestions(content) {
  const parts = content.split(/(?=Q\d+[:.])/).map(p => p.trim()).filter(p => p.length > 5);
  return parts.length ? parts : [content.trim()];
}

// ── COUNTER ───────────────────────────────────────────────
function Counter({ label, icon, value, onChange, min = 0, max = 10 }) {
  return (
    <div className="counter">
      <div className="counter-label">
        <span className="counter-icon">{icon}</span>
        <span className="counter-txt">{label}</span>
      </div>
      <div className="counter-controls">
        <button className="counter-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
        <span className="counter-val">{value}</span>
        <button className="counter-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}

// ── QUESTION CARD ─────────────────────────────────────────
function QuestionCard({ rawText, index }) {
  const lines        = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const questionLine = lines[0] || "";
  const question     = questionLine.replace(/^Q\d+[:.]\s*/, "").trim();
  const options      = lines.filter(l => /^[A-Da-d][).]/.test(l));
  const answerLine   = lines.find(l => /^Answer[:\s]/i.test(l));
  const answer       = answerLine ? answerLine.replace(/^Answer[:\s]*/i, "").trim() : "";
  const maIndex      = lines.findIndex(l => /^Model\s*Answer[:\s]/i.test(l));
  const modelAnswer  = maIndex >= 0 ? lines.slice(maIndex).join(" ").replace(/^Model\s*Answer[:\s]*/i, "").trim() : "";
  const isMCQ        = options.length >= 2;
  const isEssay      = modelAnswer.length > 0;
  const isTF         = !isMCQ && !isEssay && (/true|false|صح|خطأ/i.test(answer) || lines.some(l => /^Answer.*true|^Answer.*false/i.test(l)));

  return (
    <div className="q-card">
      <div className="q-num">Question {index + 1}</div>
      <p className="q-text" dir="auto">{question || questionLine}</p>
      {isMCQ && (
        <div className="q-options">
          {options.map((opt, i) => {
            const letter = opt[0].toUpperCase();
            const text   = opt.replace(/^[A-Da-d][).]\s*/, "").trim();
            const isCorrect = answer.toUpperCase().startsWith(letter);
            return (
              <div key={i} className={`q-opt${isCorrect ? " correct" : ""}`}>
                <span className="q-ltr">{letter}</span>
                <span className="q-opt-txt" dir="auto" style={{textAlign: /[؀-ۿ]/.test(text) ? "right" : "left"}}>{text}</span>
                {isCorrect && <span className="q-tick">✓</span>}
              </div>
            );
          })}
        </div>
      )}
      {isTF && answer && (
        <span className={`q-tf ${/true|صح/i.test(answer) ? "true" : "false"}`}>
          {/true|صح/i.test(answer) ? "True" : "False"}
        </span>
      )}
      {isEssay && modelAnswer && (
        <div className="q-ma">
          <span className="q-ma-lbl">Model answer</span>
          <p className="q-ma-txt" dir="auto">{modelAnswer}</p>
        </div>
      )}
    </div>
  );
}

// ── SECTION ───────────────────────────────────────────────
function Section({ title, content }) {
  const [copied, setCopied] = useState(false);
  const questions = splitQuestions(content);
  const t = title.toLowerCase();
  const icon = t.includes("multiple") ? <IconTarget/> : t.includes("true") ? <IconCheckCircle/> : t.includes("essay") ? <IconPencil/> : <IconHelp/>;

  return (
    <div className="section">
      <div className="section-head">
        <h2 className="section-title">{icon} {title}</h2>
        <button className="btn-copy" onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? <><IconCheck /> Copied</> : <><IconCopy /> Copy</>}
        </button>
      </div>
      {questions.map((q, i) => <QuestionCard key={i} rawText={q} index={i} />)}
    </div>
  );
}

// ── HISTORY PANEL ─────────────────────────────────────────
function HistoryPanel({ history, onSelect, onDelete, onClearAll, onClose }) {
  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <h3 className="history-title"><IconHistory /> History</h3>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            {history.length > 0 && (
              <button className="history-clear" onClick={onClearAll}>Clear all</button>
            )}
            <button className="history-close" onClick={onClose}><IconX /></button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="history-empty">No history yet. Generated sets will appear here.</div>
        ) : (
          <div className="history-list">
            {history.map(item => (
              <div key={item.id} className="history-item" onClick={() => { onSelect(item); onClose(); }}>
                <div className="history-item-info">
                  <span className="history-item-file"><IconFile /> {item.filename}</span>
                  <span className="history-item-meta">
                    <span className="meta-stat"><IconTarget/>{item.numMCQ}</span>
                    <span className="meta-stat"><IconCheckCircle/>{item.numTF}</span>
                    <span className="meta-stat"><IconPencil/>{item.numEssay}</span>
                    <span className="meta-dot">·</span>{item.date}
                  </span>
                </div>
                <button className="history-delete" onClick={e => { e.stopPropagation(); onDelete(item.id); }}>
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────
export default function App() {
  const [dark, setDark]           = useState(false);
  const [file, setFile]           = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [progress, setProgress]   = useState(0);
  const [progMsg, setProgMsg]     = useState("");
  const [numMCQ,   setNumMCQ]     = useState(5);
  const [numTF,    setNumTF]      = useState(2);
  const [numEssay, setNumEssay]   = useState(2);
  const [history, setHistory]     = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef();

  useEffect(() => { saveHistory(history); }, [history]);

  const addToHistory = (questions, filename) => {
    const item = {
      id:       Date.now(),
      filename,
      numMCQ,
      numTF,
      numEssay,
      questions,
      date: new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }),
    };
    setHistory(prev => [item, ...prev].slice(0, MAX_HISTORY));
  };

  const validateFile = (f) => {
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) { setError(`File type not allowed. Allowed: ${ALLOWED_EXT.join(", ")}`); return false; }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) { setError(`File too large. Max ${MAX_SIZE_MB}MB.`); return false; }
    return true;
  };

  const handleFile = (f) => {
    if (!f) return;
    setError(""); setResult(null);
    if (validateFile(f)) setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleGenerate = async () => {
    if (!file) return;
    if (numMCQ + numTF + numEssay === 0) { setError("Please select at least one question."); return; }
    setLoading(true); setError(""); setResult(null); setProgress(0);
    const messages = ["Extracting text...", "Analyzing content...", "Generating questions...", "Almost done..."];
    let step = 0;
    setProgMsg(messages[0]);
    const interval = setInterval(() => {
      setProgress(p => {
        const next = p + Math.random() * 10;
        if (next > 25 && step === 0) { step = 1; setProgMsg(messages[1]); }
        if (next > 55 && step === 1) { step = 2; setProgMsg(messages[2]); }
        if (next > 80 && step === 2) { step = 3; setProgMsg(messages[3]); }
        return Math.min(next, 88);
      });
    }, 700);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("num_mcq",   numMCQ);
      formData.append("num_tf",    numTF);
      formData.append("num_essay", numEssay);
      const res  = await fetch(API_URL, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setResult(data.questions);
        addToHistory(data.questions, file.name);
        setLoading(false);
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setError(err.message.includes("fetch")
        ? "Can't connect to server. Make sure the API is running on port 8000."
        : err.message
      );
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([result], { type: "text/plain;charset=utf-8" }));
    a.download = `questions_${Date.now()}.txt`;
    a.click();
  };

  const sections = result ? parseSections(result) : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

        /* ── Azure Logic design tokens ───────────────────── */
        :root{
          --primary:#2563eb; --primary-dim:#1d4ed8;
          --secondary:#0d9488; --secondary-bg:#f0fdfa;
          --amber:#d97706;
          --error:#ba1a1a; --error-bg:#ffdad6;
          --r-input:0.5rem; --r-card:1rem; --r-pill:9999px;
          --t:0.22s cubic-bezier(.4,0,.2,1);
        }
        .light{
          --bg:#faf8ff; --sur:#ffffff; --sur2:#f3f3fe; --sur3:#ededf9;
          --bdr:#e2e8f0; --txt:#191b23; --txt2:#434655;
          --shadow:rgba(37,99,235,.08);
        }
        .dark{
          --bg:#15161d; --sur:#1c1e28; --sur2:#23252f; --sur3:#2a2c38;
          --bdr:#333544; --txt:#f0f0fb; --txt2:#9a9db3;
          --shadow:rgba(0,0,0,.35);
        }
        .dark,.light{color:var(--txt);background:var(--bg);min-height:100vh}

        body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--txt);min-height:100vh;transition:background var(--t),color var(--t)}

        .wrap{max-width:840px;margin:0 auto;padding:40px 24px 88px}

        /* ── Nav ──────────────────────────────────────────── */
        .nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:56px;padding-bottom:20px;border-bottom:1px solid var(--bdr)}
        .logo{display:flex;align-items:center;gap:9px;font-family:'DM Sans',sans-serif;font-weight:700;font-size:1.25rem;letter-spacing:-.01em;color:var(--txt)}
        .logo-dot{width:8px;height:8px;border-radius:50%;background:var(--primary)}
        .nav-actions{display:flex;align-items:center;gap:10px}
        .history-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--r-input);border:1px solid var(--bdr);background:var(--sur);color:var(--txt2);font-size:.82rem;font-weight:500;cursor:pointer;transition:all var(--t);position:relative}
        .history-btn:hover{border-color:var(--primary);color:var(--primary)}
        .history-badge{position:absolute;top:-6px;right:-6px;width:17px;height:17px;border-radius:50%;background:var(--secondary);color:#fff;font-size:.63rem;font-weight:600;display:flex;align-items:center;justify-content:center}
        .theme-btn{width:38px;height:38px;border-radius:50%;border:1px solid var(--bdr);background:var(--sur);color:var(--txt2);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all var(--t)}
        .theme-btn:hover{border-color:var(--primary);color:var(--primary)}

        /* ── Hero ─────────────────────────────────────────── */
        .hero{margin-bottom:48px;text-align:center;display:flex;flex-direction:column;align-items:center}
        .hero-eyebrow{display:inline-flex;align-items:center;gap:6px;color:var(--amber);font-size:.8rem;font-weight:600;margin-bottom:14px}
        .hero h1{font-family:'DM Sans',sans-serif;font-size:clamp(1.9rem,4.6vw,2.9rem);font-weight:700;letter-spacing:-.02em;line-height:1.15;color:var(--txt);margin-bottom:14px;max-width:16ch}
        .hero p{color:var(--txt2);font-size:1.05rem;font-weight:400;max-width:46ch;line-height:1.6}

        /* ── Upload zone ──────────────────────────────────── */
        .upload-zone{border:1.5px dashed var(--bdr);border-radius:var(--r-card);padding:40px 28px;text-align:center;cursor:pointer;background:var(--sur);transition:all var(--t)}
        .upload-zone:hover,.upload-zone.drag{border-color:var(--primary);background:var(--sur2)}
        .upload-zone.has-file{border-style:solid;border-color:var(--secondary);cursor:default;background:var(--sur)}
        .up-icon{color:var(--primary);opacity:.8;margin:0 auto 14px;width:46px;height:46px}
        .up-title{font-family:'DM Sans',sans-serif;font-weight:600;font-size:1.02rem;margin-bottom:6px}
        .up-sub{color:var(--txt2);font-size:.85rem}

        .file-row{display:flex;align-items:center;gap:11px;background:var(--sur2);border:1px solid var(--bdr);border-radius:var(--r-input);padding:13px 15px}
        .file-row svg{color:var(--primary);flex-shrink:0}
        .file-nm{flex:1;font-size:.88rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .file-sz{color:var(--txt2);font-size:.78rem;flex-shrink:0}
        .rm-btn{background:none;border:none;cursor:pointer;color:var(--txt2);padding:3px;border-radius:6px;display:flex;transition:all var(--t)}
        .rm-btn:hover{color:var(--error);background:var(--error-bg)}

        /* ── Counters ─────────────────────────────────────── */
        .counters{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
        @media(max-width:540px){.counters{grid-template-columns:1fr}}
        .counter{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r-card);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;transition:border-color var(--t)}
        .counter:hover{border-color:var(--primary)}
        .counter-label{display:flex;align-items:center;gap:8px;min-width:0}
        .counter-icon{display:flex;color:var(--primary);flex-shrink:0}
        .counter-txt{font-size:.82rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .counter-controls{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .counter-btn{width:26px;height:26px;border-radius:6px;border:1px solid var(--bdr);background:var(--sur2);color:var(--txt);font-size:1rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all var(--t);line-height:1}
        .counter-btn:hover:not(:disabled){border-color:var(--primary);color:var(--primary)}
        .counter-btn:disabled{opacity:.3;cursor:not-allowed}
        .counter-val{font-family:'DM Sans',sans-serif;font-weight:700;font-size:1.02rem;color:var(--primary);min-width:20px;text-align:center}

        /* ── Generate button ──────────────────────────────── */
        .gen-btn{width:100%;padding:16px;border:none;border-radius:var(--r-input);background:var(--primary);color:#fff;font-family:'DM Sans',sans-serif;font-weight:600;font-size:.98rem;cursor:pointer;margin-top:16px;display:flex;align-items:center;justify-content:center;gap:9px;transition:all var(--t);box-shadow:0 8px 20px var(--shadow)}
        .gen-btn:hover:not(:disabled){background:var(--primary-dim)}
        .gen-btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}

        .prog-bar{height:3px;background:var(--sur3);border-radius:99px;overflow:hidden;margin-top:14px}
        .prog-fill{height:100%;background:var(--primary);border-radius:99px;transition:width .6s ease}
        .prog-lbl{text-align:center;font-size:.8rem;color:var(--txt2);margin-top:7px}

        .err{background:var(--error-bg);border:1px solid var(--error);border-radius:var(--r-input);padding:13px 15px;color:var(--error);font-size:.88rem;margin-top:14px}

        /* ── Results ──────────────────────────────────────── */
        .results{margin-top:52px}
        .res-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px}
        .res-title{font-family:'DM Sans',sans-serif;font-weight:700;font-size:1.3rem;letter-spacing:-.01em;color:var(--txt)}
        .btn-dl{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:var(--r-input);border:1px solid var(--bdr);background:var(--sur);color:var(--txt);font-size:.85rem;font-weight:500;cursor:pointer;transition:all var(--t)}
        .btn-dl:hover{border-color:var(--primary);color:var(--primary)}

        .divider{height:1px;background:var(--bdr);margin:0 0 32px}

        .section{margin-bottom:36px}
        .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
        .section-title{font-family:'DM Sans',sans-serif;font-weight:600;font-size:1.02rem;display:flex;align-items:center;gap:7px;color:var(--txt)}
        .section-title svg{color:var(--primary);flex-shrink:0}
        .btn-copy{display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:var(--r-input);border:1px solid var(--bdr);background:var(--sur2);color:var(--txt2);font-size:.8rem;font-weight:500;cursor:pointer;transition:all var(--t)}
        .btn-copy:hover{border-color:var(--primary);color:var(--primary)}

        .q-card{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r-card);padding:18px 20px;margin-bottom:10px;border-left:3px solid var(--primary);transition:border-color var(--t);unicode-bidi:plaintext}
        .q-card:hover{border-color:var(--primary)}
        .q-num{font-family:'Inter',sans-serif;font-weight:600;font-size:.7rem;letter-spacing:.05em;color:var(--primary);margin-bottom:7px;text-transform:uppercase}
        .q-text{font-size:.96rem;line-height:1.65;font-weight:500;margin-bottom:13px;color:var(--txt)}
        .q-options{display:flex;flex-direction:column;gap:7px}
        .q-opt{display:flex;align-items:center;gap:9px;padding:8px 12px;border-radius:var(--r-input);background:var(--sur2);border:1px solid transparent;transition:all var(--t);direction:ltr}
        .q-opt-txt{font-size:.86rem;flex:1;text-align:start;color:var(--txt)}
        .q-opt.correct{border-color:var(--secondary);background:var(--secondary-bg)}
        .q-opt.correct .q-opt-txt{color:#0f766e;font-weight:500}
        .q-ltr{width:22px;height:22px;border-radius:6px;background:var(--bdr);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.76rem;flex-shrink:0;color:var(--txt2)}
        .q-opt.correct .q-ltr{background:var(--secondary);color:#fff}
        .q-tick{margin-inline-start:auto;font-size:.82rem;font-weight:700;color:#0f766e;flex-shrink:0}
        .q-tf{display:inline-flex;align-items:center;padding:7px 15px;border-radius:var(--r-pill);font-weight:600;font-size:.86rem}
        .q-tf.true{background:var(--secondary-bg);color:#0f766e}
        .q-tf.false{background:var(--error-bg);color:var(--error)}
        .q-ma{margin-top:13px;padding:13px 15px;border-radius:var(--r-input);background:var(--secondary-bg);border:1px solid #99f6e4}
        .q-ma-lbl{display:block;font-size:.72rem;font-weight:600;letter-spacing:.05em;color:var(--secondary);margin-bottom:5px;text-transform:uppercase}
        .q-ma-txt{font-size:.86rem;line-height:1.7;color:var(--txt2)}

        .dots{display:flex;align-items:center;justify-content:center;gap:5px}
        .dot{width:6px;height:6px;border-radius:50%;background:#fff;animation:bounce 1.2s ease-in-out infinite}
        .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
        @keyframes bounce{0%,80%,100%{transform:scale(.7);opacity:.5}40%{transform:scale(1.1);opacity:1}}

        /* ── History panel ────────────────────────────────── */
        .history-overlay{position:fixed;inset:0;background:rgba(15,17,23,.45);z-index:100;display:flex;justify-content:flex-end}
        .history-panel{width:min(420px,100vw);height:100vh;background:var(--sur);border-left:1px solid var(--bdr);display:flex;flex-direction:column}
        .history-header{display:flex;align-items:center;justify-content:space-between;padding:20px 20px 16px;border-bottom:1px solid var(--bdr)}
        .history-title{font-family:'DM Sans',sans-serif;font-weight:600;font-size:1rem;display:flex;align-items:center;gap:8px}
        .history-clear{font-size:.78rem;color:var(--error);background:none;border:none;cursor:pointer;opacity:.8;transition:opacity var(--t)}
        .history-clear:hover{opacity:1}
        .history-close{background:none;border:none;cursor:pointer;color:var(--txt2);display:flex;padding:4px;border-radius:6px;transition:all var(--t)}
        .history-close:hover{color:var(--txt);background:var(--sur2)}
        .history-empty{padding:40px 20px;text-align:center;color:var(--txt2);font-size:.9rem}
        .history-list{flex:1;overflow-y:auto;padding:12px}
        .history-item{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--r-input);border:1px solid var(--bdr);margin-bottom:8px;cursor:pointer;transition:all var(--t);background:var(--sur2)}
        .history-item:hover{border-color:var(--primary)}
        .history-item-info{flex:1;min-width:0}
        .history-item-file{display:flex;align-items:center;gap:6px;font-size:.88rem;font-weight:500;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .history-item-meta{font-size:.76rem;color:var(--txt2);display:inline-flex;align-items:center;gap:9px}
        .meta-stat{display:inline-flex;align-items:center;gap:3px}
        .meta-stat svg{width:11px;height:11px}
        .meta-dot{opacity:.6}
        .history-delete{background:none;border:none;cursor:pointer;color:var(--txt2);padding:5px;border-radius:6px;display:flex;flex-shrink:0;transition:all var(--t)}
        .history-delete:hover{color:var(--error);background:var(--error-bg)}

        @media(max-width:600px){.wrap{padding:24px 16px 64px}.res-head{flex-direction:column;align-items:flex-start;gap:10px}}
      `}</style>

      <div className={dark ? "dark" : "light"}>
        <div className="wrap">

          <nav className="nav">
            <div className="logo"><div className="logo-dot"/>QuizForge</div>
            <div className="nav-actions">
              <button className="history-btn" onClick={() => setShowHistory(true)}>
                <IconHistory /> History
                {history.length > 0 && <span className="history-badge">{history.length}</span>}
              </button>
              <button className="theme-btn" onClick={() => setDark(!dark)}>
                {dark ? <IconSun/> : <IconMoon/>}
              </button>
            </div>
          </nav>

          <div className="hero">
            <div className="hero-eyebrow"><IconSparkle/> AI-generated</div>
            <h1>Turn any lecture file into a ready-to-use question set</h1>
            <p>Upload a document and get multiple-choice, true/false, and essay questions, formatted and ready to share.</p>
          </div>

          <div
            className={`upload-zone${dragging?" drag":""}${file?" has-file":""}`}
            onDrop={onDrop}
            onDragOver={e=>{e.preventDefault();setDragging(true)}}
            onDragLeave={()=>setDragging(false)}
            onClick={()=>!file&&inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" hidden accept={ALLOWED_EXT.join(",")} onChange={e=>handleFile(e.target.files[0])}/>
            {!file ? (
              <>
                <div className="up-icon"><IconUpload/></div>
                <p className="up-title">Drop your file here</p>
                <p className="up-sub">PDF, DOCX, PPTX, TXT, or images — max {MAX_SIZE_MB}MB</p>
              </>
            ) : (
              <div className="file-row" onClick={e=>e.stopPropagation()}>
                <IconFile/>
                <span className="file-nm">{file.name}</span>
                <span className="file-sz">{(file.size/1024/1024).toFixed(2)} MB</span>
                <button className="rm-btn" onClick={()=>{setFile(null);setResult(null);setError("")}}><IconX/></button>
              </div>
            )}
          </div>

          <div className="counters">
            <Counter label="MCQ"        icon={<IconTarget/>}      value={numMCQ}   onChange={setNumMCQ}   min={0} max={10}/>
            <Counter label="True/False" icon={<IconCheckCircle/>} value={numTF}    onChange={setNumTF}    min={0} max={10}/>
            <Counter label="Essay"      icon={<IconPencil/>}      value={numEssay} onChange={setNumEssay} min={0} max={10}/>
          </div>

          {error && <div className="err">{error}</div>}

          <button className="gen-btn" onClick={handleGenerate} disabled={!file||loading}>
            {loading
              ? <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
              : <><IconSparkle/><span>Generate questions</span></>}
          </button>

          {loading && (
            <>
              <div className="prog-bar"><div className="prog-fill" style={{width:`${progress}%`}}/></div>
              <p className="prog-lbl">{progMsg}</p>
            </>
          )}

          {result && (
            <div className="results">
              <div className="divider"/>
              <div className="res-head">
                <h2 className="res-title">Generated questions</h2>
                <button className="btn-dl" onClick={handleDownload}><IconDownload/> Download .txt</button>
              </div>
              {sections.map((s,i) => <Section key={i} title={s.title} content={s.content}/>)}
            </div>
          )}

        </div>

        {showHistory && (
          <HistoryPanel
            history={history}
            onSelect={item => { setResult(item.questions); setNumMCQ(item.numMCQ); setNumTF(item.numTF); setNumEssay(item.numEssay); }}
            onDelete={id => setHistory(prev => prev.filter(h => h.id !== id))}
            onClearAll={() => setHistory([])}
            onClose={() => setShowHistory(false)}
          />
        )}

      </div>
    </>
  );
}