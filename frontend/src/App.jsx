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
function Counter({ label, emoji, value, onChange, min = 0, max = 10 }) {
  return (
    <div className="counter">
      <div className="counter-label">
        <span className="counter-emoji">{emoji}</span>
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
      <div className="q-num">Q{index + 1}</div>
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
          {/true|صح/i.test(answer) ? "✓ True" : "✗ False"}
        </span>
      )}
      {isEssay && modelAnswer && (
        <div className="q-ma">
          <span className="q-ma-lbl">Model Answer</span>
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
  const icons = { "Multiple Choice Questions":"🎯", "True / False Questions":"✅", "Essay Questions":"📝" };
  const icon = Object.entries(icons).find(([k]) => title.toLowerCase().includes(k.toLowerCase().split(" ")[0].toLowerCase()))?.[1] || "❓";

  return (
    <div className="section">
      <div className="section-head">
        <h2 className="section-title">{icon} {title}</h2>
        <button className="btn-copy" onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? <><IconCheck /> Copied!</> : <><IconCopy /> Copy</>}
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
          <div className="history-empty">No history yet — generate some questions!</div>
        ) : (
          <div className="history-list">
            {history.map(item => (
              <div key={item.id} className="history-item" onClick={() => { onSelect(item); onClose(); }}>
                <div className="history-item-info">
                  <span className="history-item-file"><IconFile /> {item.filename}</span>
                  <span className="history-item-meta">
                    🎯{item.numMCQ} &nbsp; ✅{item.numTF} &nbsp; 📝{item.numEssay}
                    &nbsp;·&nbsp; {item.date}
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
  const [dark, setDark]           = useState(true);
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
    if (!ALLOWED_EXT.includes(ext)) { setError(`❌ File type not allowed. Allowed: ${ALLOWED_EXT.join(", ")}`); return false; }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) { setError(`❌ File too large. Max ${MAX_SIZE_MB}MB.`); return false; }
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
    if (numMCQ + numTF + numEssay === 0) { setError("❌ Please select at least one question."); return; }
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
        ? "❌ Cannot connect to server. Make sure the API is running on port 8000."
        : `❌ ${err.message}`
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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--accent:#f97316;--purple:#a855f7;--cyan:#06b6d4;--green:#22c55e;--red:#ef4444;--r:14px;--rs:10px;--t:0.28s cubic-bezier(.4,0,.2,1)}

        .dark{--bg:#09090f;--sur:#111118;--sur2:#1a1a24;--bdr:rgba(255,255,255,0.08);--txt:#f0eeff;--txt2:#9896b8}
        .light{--bg:#f4f2ff;--sur:#ffffff;--sur2:#ede9fe;--bdr:rgba(0,0,0,0.07);--txt:#17132a;--txt2:#6b618a}
        .dark,.light{color:var(--txt)}

        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--txt);min-height:100vh;transition:background var(--t),color var(--t)}

        .orb{position:fixed;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:0}
        .o1{width:420px;height:420px;top:-120px;right:-80px;background:radial-gradient(circle,rgba(249,115,22,.18),transparent 70%)}
        .o2{width:360px;height:360px;bottom:-80px;left:-80px;background:radial-gradient(circle,rgba(168,85,247,.14),transparent 70%)}

        .wrap{position:relative;z-index:1;max-width:860px;margin:0 auto;padding:36px 22px 80px}

        .nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:52px}
        .logo{display:flex;align-items:center;gap:9px;font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;letter-spacing:-.03em}
        .logo-dot{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 14px var(--accent)}
        .nav-actions{display:flex;align-items:center;gap:10px}
        .history-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--rs);border:1px solid var(--bdr);background:var(--sur);color:var(--txt);font-size:.82rem;font-weight:500;cursor:pointer;transition:all var(--t);position:relative}
        .history-btn:hover{border-color:var(--purple);color:var(--purple)}
        .history-badge{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--purple);color:#fff;font-size:.65rem;font-weight:700;display:flex;align-items:center;justify-content:center}
        .theme-btn{width:42px;height:42px;border-radius:50%;border:1px solid var(--bdr);background:var(--sur);color:var(--txt);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all var(--t)}
        .theme-btn:hover{border-color:var(--accent);color:var(--accent);transform:rotate(20deg)}

        .hero{text-align:center;margin-bottom:44px}
        .hero h1{font-family:'Syne',sans-serif;font-size:clamp(2.2rem,5.5vw,3.6rem);font-weight:800;letter-spacing:-.04em;line-height:1.06;margin-bottom:14px;color:inherit}
        .dark .hero h1{color:#17132a}
        .light .hero h1{color:#17132a}
        .dark .ho,.light .ho{color:#f97316 !important}
        .dark .hp,.light .hp{color:#a855f7 !important}
        .dark .logo{color:#17132a}
        .light .logo{color:#17132a}

        .hero p{color:var(--txt2);font-size:1rem;font-weight:300;max-width:440px;margin:0 auto;line-height:1.65}

        .upload-zone{border:2px dashed var(--bdr);border-radius:var(--r);padding:44px 28px;text-align:center;cursor:pointer;background:var(--sur);transition:all var(--t);position:relative;overflow:hidden}
        .upload-zone::after{content:'';position:absolute;inset:0;background:rgba(249,115,22,.07);opacity:0;transition:opacity var(--t)}
        .upload-zone:hover,.upload-zone.drag{border-color:var(--accent)}
        .upload-zone:hover::after,.upload-zone.drag::after{opacity:1}
        .upload-zone.has-file{border-style:solid;border-color:var(--purple);cursor:default}
        .upload-zone.has-file::after{display:none}
        .up-icon{color:var(--accent);opacity:.75;margin:0 auto 14px;width:52px;height:52px}
        .up-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1.05rem;margin-bottom:6px}
        .up-sub{color:var(--txt2);font-size:.85rem}

        .file-row{display:flex;align-items:center;gap:11px;background:var(--sur2);border:1px solid var(--bdr);border-radius:var(--rs);padding:13px 15px;position:relative;z-index:1}
        .file-row svg{color:var(--purple);flex-shrink:0}
        .file-nm{flex:1;font-size:.88rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .file-sz{color:var(--txt2);font-size:.78rem;flex-shrink:0}
        .rm-btn{background:none;border:none;cursor:pointer;color:var(--txt2);padding:3px;border-radius:6px;display:flex;transition:all var(--t)}
        .rm-btn:hover{color:var(--red);background:rgba(239,68,68,.1)}

        .counters{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
        @media(max-width:540px){.counters{grid-template-columns:1fr}}
        .counter{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;transition:border-color var(--t)}
        .counter:hover{border-color:rgba(249,115,22,.3)}
        .counter-label{display:flex;align-items:center;gap:8px;min-width:0}
        .counter-emoji{font-size:1.1rem;flex-shrink:0}
        .counter-txt{font-size:.82rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .counter-controls{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .counter-btn{width:28px;height:28px;border-radius:8px;border:1px solid var(--bdr);background:var(--sur2);color:var(--txt);font-size:1rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all var(--t);line-height:1}
        .counter-btn:hover:not(:disabled){border-color:var(--accent);color:var(--accent);background:rgba(249,115,22,.08)}
        .counter-btn:disabled{opacity:.3;cursor:not-allowed}
        .counter-val{font-family:'Syne',sans-serif;font-weight:800;font-size:1.05rem;color:var(--accent);min-width:20px;text-align:center}

        .gen-btn{width:100%;padding:17px;border:none;border-radius:var(--r);background:linear-gradient(135deg,var(--accent),var(--purple));color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;cursor:pointer;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:9px;transition:all var(--t)}
        .gen-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 28px rgba(249,115,22,.28)}
        .gen-btn:disabled{opacity:.5;cursor:not-allowed}

        .prog-bar{height:3px;background:var(--sur2);border-radius:99px;overflow:hidden;margin-top:14px}
        .prog-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--purple),var(--cyan));border-radius:99px;transition:width .6s ease}
        .prog-lbl{text-align:center;font-size:.8rem;color:var(--txt2);margin-top:7px}

        .err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.22);border-radius:var(--rs);padding:13px 15px;color:#f87171;font-size:.88rem;margin-top:14px}

        .results{margin-top:52px}
        .res-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}
        .res-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.4rem;letter-spacing:-.03em;color:var(--txt)}
        .btn-dl{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:var(--rs);border:1px solid var(--bdr);background:var(--sur);color:var(--txt);font-size:.85rem;font-weight:500;cursor:pointer;transition:all var(--t)}
        .btn-dl:hover{border-color:var(--cyan);color:var(--cyan)}

        .divider{height:1px;background:linear-gradient(90deg,transparent,var(--bdr),transparent);margin:0 0 32px}

        .section{margin-bottom:36px;animation:up .45s ease both}
        @keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
        .section-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1.05rem;display:flex;align-items:center;gap:7px;color:var(--txt)}
        .btn-copy{display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:var(--rs);border:1px solid var(--bdr);background:var(--sur2);color:var(--txt2);font-size:.8rem;font-weight:500;cursor:pointer;transition:all var(--t)}
        .btn-copy:hover{border-color:var(--purple);color:var(--purple)}

        .q-card{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);padding:18px 20px;margin-bottom:10px;border-left:3px solid var(--accent);transition:all var(--t);animation:up .4s ease both;unicode-bidi:plaintext}
        .q-card:hover{border-color:rgba(249,115,22,.25);transform:translateX(3px)}
        .q-num{font-family:'Syne',sans-serif;font-weight:800;font-size:.7rem;letter-spacing:.08em;color:var(--accent);margin-bottom:7px}
        .q-text{font-size:.95rem;line-height:1.65;font-weight:500;margin-bottom:13px}
        .q-options{display:flex;flex-direction:column;gap:7px}
        .q-opt{display:flex;align-items:center;gap:9px;padding:8px 12px;border-radius:var(--rs);background:var(--sur2);border:1px solid transparent;transition:all var(--t);direction:ltr}
        .q-opt-txt{font-size:.86rem;flex:1;text-align:start}
        .q-opt.correct{border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.08)}
        .q-opt.correct .q-opt-txt{color:#16a34a;font-weight:500}
        .q-ltr{width:22px;height:22px;border-radius:6px;background:var(--bdr);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.76rem;flex-shrink:0;color:var(--txt2)}
        .q-opt.correct .q-ltr{background:var(--green);color:#fff}
        .q-tick{margin-inline-start:auto;font-size:.82rem;font-weight:700;color:#16a34a;flex-shrink:0}
        .q-tf{display:inline-flex;align-items:center;padding:7px 15px;border-radius:99px;font-weight:700;font-size:.86rem}
        .q-tf.true{background:rgba(34,197,94,.12);color:#16a34a}
        .q-tf.false{background:rgba(239,68,68,.12);color:#dc2626}
        .q-ma{margin-top:13px;padding:13px 15px;border-radius:var(--rs);background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.18)}
        .q-ma-lbl{display:block;font-size:.72rem;font-weight:700;letter-spacing:.06em;color:var(--purple);margin-bottom:5px;text-transform:uppercase}
        .q-ma-txt{font-size:.86rem;line-height:1.7;color:var(--txt2)}

        .dots{display:flex;align-items:center;justify-content:center;gap:5px}
        .dot{width:7px;height:7px;border-radius:50%;background:#fff;animation:bounce 1.2s ease-in-out infinite}
        .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
        @keyframes bounce{0%,80%,100%{transform:scale(.7);opacity:.5}40%{transform:scale(1.1);opacity:1}}

        .history-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;display:flex;justify-content:flex-end;animation:fadeIn .2s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .history-panel{width:min(420px,100vw);height:100vh;background:var(--sur);border-left:1px solid var(--bdr);display:flex;flex-direction:column;animation:slideIn .25s ease}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .history-header{display:flex;align-items:center;justify-content:space-between;padding:20px 20px 16px;border-bottom:1px solid var(--bdr)}
        .history-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;display:flex;align-items:center;gap:8px}
        .history-clear{font-size:.78rem;color:var(--red);background:none;border:none;cursor:pointer;opacity:.7;transition:opacity var(--t)}
        .history-clear:hover{opacity:1}
        .history-close{background:none;border:none;cursor:pointer;color:var(--txt2);display:flex;padding:4px;border-radius:6px;transition:all var(--t)}
        .history-close:hover{color:var(--txt);background:var(--sur2)}
        .history-empty{padding:40px 20px;text-align:center;color:var(--txt2);font-size:.9rem}
        .history-list{flex:1;overflow-y:auto;padding:12px}
        .history-item{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--rs);border:1px solid var(--bdr);margin-bottom:8px;cursor:pointer;transition:all var(--t);background:var(--sur2)}
        .history-item:hover{border-color:var(--accent);transform:translateX(-3px)}
        .history-item-info{flex:1;min-width:0}
        .history-item-file{display:flex;align-items:center;gap:6px;font-size:.88rem;font-weight:500;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .history-item-meta{font-size:.76rem;color:var(--txt2)}
        .history-delete{background:none;border:none;cursor:pointer;color:var(--txt2);padding:5px;border-radius:6px;display:flex;flex-shrink:0;transition:all var(--t)}
        .history-delete:hover{color:var(--red);background:rgba(239,68,68,.1)}

        @media(max-width:600px){.wrap{padding:22px 14px 60px}.hero h1{font-size:2rem}.res-head{flex-direction:column;align-items:flex-start;gap:10px}}
      `}</style>

      <div className={dark ? "dark" : "light"}>
        <div className="orb o1"/><div className="orb o2"/>
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
            <h1>Generate <span className="ho">Smart</span><br/>Questions <span className="hp">Instantly</span></h1>
            <p>Upload your lecture file and get MCQ, True/False, and Essay questions powered by AI.</p>
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
                <p className="up-sub">PDF, DOCX, PPTX, TXT, or Images — max {MAX_SIZE_MB}MB</p>
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
            <Counter label="MCQ"        emoji="🎯" value={numMCQ}   onChange={setNumMCQ}   min={0} max={10}/>
            <Counter label="True/False" emoji="✅" value={numTF}    onChange={setNumTF}    min={0} max={10}/>
            <Counter label="Essay"      emoji="📝" value={numEssay} onChange={setNumEssay} min={0} max={10}/>
          </div>

          {error && <div className="err">{error}</div>}

          <button className="gen-btn" onClick={handleGenerate} disabled={!file||loading}>
            {loading
              ? <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
              : <><IconSparkle/><span>Generate Questions</span></>}
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
                <h2 className="res-title">Generated Questions ✨</h2>
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