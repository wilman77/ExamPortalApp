import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  GraduationCap,
  Home,
  Info,
  ListChecks,
  LockKeyhole,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';

type Question = { prompt: string; options: string[]; answer: number; explanation: string };
type Progress = { answers: Record<number, number>; expiresAt: number };
type ExamScreen = 'home' | 'exam' | 'result';

const EXAM_LENGTH = 20 * 60;
const progressKey = 'examportal-progress';
const questions: Question[] = [
  { prompt: 'Jika 3x + 5 = 20, berapakah nilai x?', options: ['3', '5', '7', '15'], answer: 1, explanation: 'Kurangi kedua ruas dengan 5, sehingga 3x = 15. Kemudian bagi 3, jadi x = 5.' },
  { prompt: 'Sebuah segitiga memiliki alas 8 cm dan tinggi 6 cm. Berapakah luasnya?', options: ['14 cm²', '24 cm²', '28 cm²', '48 cm²'], answer: 1, explanation: 'Luas segitiga adalah ½ × alas × tinggi = ½ × 8 × 6 = 24 cm².' },
  { prompt: 'Perbandingan 12 : 18 dalam bentuk paling sederhana adalah ...', options: ['2 : 3', '3 : 4', '4 : 5', '6 : 9'], answer: 0, explanation: 'Kedua bilangan dibagi dengan FPB-nya, yaitu 6. Hasilnya 2 : 3.' },
  { prompt: 'Berapakah hasil dari 2³ + 4 × 2?', options: ['16', '20', '24', '32'], answer: 0, explanation: 'Kerjakan pangkat dan perkalian terlebih dahulu: 8 + 8 = 16.' },
  { prompt: 'Rata-rata dari 6, 8, 10, dan 12 adalah ...', options: ['8', '9', '10', '11'], answer: 1, explanation: 'Jumlahkan seluruh data lalu bagi banyaknya data: (6 + 8 + 10 + 12) ÷ 4 = 9.' },
  { prompt: 'Sebuah persegi memiliki keliling 36 cm. Berapa panjang setiap sisinya?', options: ['6 cm', '8 cm', '9 cm', '12 cm'], answer: 2, explanation: 'Persegi memiliki 4 sisi sama panjang. Panjang satu sisi adalah 36 ÷ 4 = 9 cm.' },
];

function readProgress(): Progress | null {
  try {
    const value = localStorage.getItem(progressKey);
    return value ? JSON.parse(value) as Progress : null;
  } catch {
    return null;
  }
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function App() {
  const initialProgress = readProgress();
  const [screen, setScreen] = useState<ExamScreen>(initialProgress && initialProgress.expiresAt > Date.now() ? 'exam' : 'home');
  const [answers, setAnswers] = useState<Record<number, number>>(initialProgress?.answers ?? {});
  const [expiresAt, setExpiresAt] = useState<number | null>(initialProgress?.expiresAt ?? null);
  const [secondsLeft, setSecondsLeft] = useState(initialProgress ? Math.max(0, Math.ceil((initialProgress.expiresAt - Date.now()) / 1000)) : EXAM_LENGTH);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [filter, setFilter] = useState('Semua ujian');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (screen !== 'exam' || !expiresAt) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) finishExam();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen, expiresAt]);

  useEffect(() => {
    if (screen === 'exam' && expiresAt) {
      localStorage.setItem(progressKey, JSON.stringify({ answers, expiresAt }));
    }
  }, [answers, expiresAt, screen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const answeredCount = Object.keys(answers).length;
  const score = useMemo(() => questions.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0), [answers]);

  function startExam() {
    const saved = readProgress();
    if (saved && saved.expiresAt > Date.now()) {
      setAnswers(saved.answers);
      setExpiresAt(saved.expiresAt);
      setSecondsLeft(Math.ceil((saved.expiresAt - Date.now()) / 1000));
    } else {
      const newExpiry = Date.now() + EXAM_LENGTH * 1000;
      setAnswers({});
      setCurrentQuestion(0);
      setExpiresAt(newExpiry);
      setSecondsLeft(EXAM_LENGTH);
      localStorage.setItem(progressKey, JSON.stringify({ answers: {}, expiresAt: newExpiry }));
    }
    setScreen('exam');
  }

  function finishExam() {
    localStorage.removeItem(progressKey);
    setShowSubmit(false);
    setScreen('result');
  }

  function returnHome() {
    localStorage.removeItem(progressKey);
    setScreen('home');
    setAnswers({});
    setCurrentQuestion(0);
    setExpiresAt(null);
    setSecondsLeft(EXAM_LENGTH);
  }

  function chooseAnswer(optionIndex: number) {
    setAnswers((current) => ({ ...current, [currentQuestion]: optionIndex }));
  }

  return <div className="portal-shell">
    <header className="portal-header">
      <a className="portal-brand" href="#home" onClick={(event) => { event.preventDefault(); if (screen !== 'exam') returnHome(); }}><span className="portal-brand-mark"><GraduationCap size={21} /></span><span>exam<span>portal</span><small>RUANG BELAJAR SISWA</small></span></a>
      {screen === 'exam' ? <div className="exam-top-label"><LockKeyhole size={14} /> Penilaian Bab 3 <span>·</span> Matematika</div> : <nav className="portal-nav"><button className={screen === 'home' ? 'portal-nav-active' : ''} onClick={returnHome}><Home size={15} /> Beranda</button><button onClick={() => setToast('Nilai akan tampil setelah ujian dikumpulkan.')}><ListChecks size={15} /> Nilai saya</button></nav>}
      <div className="portal-header-right">{screen === 'exam' ? <div className={`header-timer ${secondsLeft < 120 ? 'timer-warning' : ''}`}><Clock3 size={15} /><span>{formatTime(secondsLeft)}</span></div> : <button className="portal-icon-button" aria-label="Notifikasi" onClick={() => setToast('Belum ada notifikasi baru.')}><Bell size={18} /><i /></button>}<div className="student-profile"><span className="student-avatar">RA</span><span className="student-name">Raka Aditya<small>Siswa · Kelas IX A</small></span><ChevronDown size={15} className="muted" /></div></div>
    </header>

    {screen === 'home' && <StudentHome filter={filter} onFilter={setFilter} onStart={startExam} onMessage={setToast} hasProgress={Boolean(readProgress() && readProgress()!.expiresAt > Date.now())} />}
    {screen === 'exam' && <ExamWorkspace currentQuestion={currentQuestion} answers={answers} secondsLeft={secondsLeft} onChoose={chooseAnswer} onNavigate={setCurrentQuestion} onSubmit={() => setShowSubmit(true)} onExit={() => setScreen('home')} />}
    {screen === 'result' && <ResultPage score={score} answers={answers} onHome={returnHome} onRetry={startExam} />}

    {showSubmit && <div className="portal-modal-backdrop"><section className="submit-modal" role="dialog" aria-modal="true" aria-labelledby="submit-title"><button className="modal-close" aria-label="Tutup" onClick={() => setShowSubmit(false)}><X size={18} /></button><div className="submit-modal-icon"><Send size={21} /></div><h2 id="submit-title">Kumpulkan jawaban?</h2><p>Kamu sudah menjawab <b>{answeredCount} dari {questions.length} soal</b>. Setelah dikumpulkan, jawaban tidak dapat diubah.</p><div className="submit-modal-actions"><button className="secondary-button" onClick={() => setShowSubmit(false)}>Periksa lagi</button><button className="student-primary" onClick={finishExam}>Ya, kumpulkan <ArrowRight size={16} /></button></div></section></div>}
    {toast && <div className="portal-toast"><CheckCircle2 size={16} />{toast}</div>}
  </div>;
}

function StudentHome({ filter, onFilter, onStart, onMessage, hasProgress }: { filter: string; onFilter: (filter: string) => void; onStart: () => void; onMessage: (message: string) => void; hasProgress: boolean }) {
  const [showTip, setShowTip] = useState(true);
  return <main className="student-main">
    <div className="welcome-banner"><div className="welcome-copy"><span className="welcome-date">SELASA, 10 NOVEMBER 2026</span><h1>Hai, Raka! Siap belajar hari ini?</h1><p>Periksa jadwal ujianmu dan lanjutkan langkah kecil menuju hasil terbaik.</p><div className="welcome-chips"><span><CheckCircle2 size={14} /> 3 ujian selesai</span><span><Clock3 size={14} /> 1 ujian mendatang</span></div></div><div className="welcome-graphic" aria-hidden="true"><div className="graphic-sun"/><div className="graphic-book"><BookOpen size={50} strokeWidth={1.3} /></div><span className="graphic-sparkle sparkle-one">✦</span><span className="graphic-sparkle sparkle-two">✧</span><span className="graphic-line line-one"/><span className="graphic-line line-two"/></div></div>
    <section className="student-stats"><div className="student-stat"><span className="student-stat-icon purple"><BookOpen size={17} /></span><div><b>4</b><span>Total ujian</span></div><small>semester ini</small></div><div className="student-stat"><span className="student-stat-icon green"><Check size={17} /></span><div><b>3</b><span>Selesai</span></div><small>bagus sekali!</small></div><div className="student-stat"><span className="student-stat-icon orange"><BarIcon /></span><div><b>86</b><span>Rata-rata nilai</span></div><small className="stat-up">↗ 6 poin</small></div></section>
    <div className="student-section-heading"><div><span className="section-eyebrow">RINGKASAN KELAS</span><h2>Ujian untukmu</h2><p>Jangan lupa persiapkan dirimu sebelum ujian dimulai.</p></div><label className="exam-filter"><select value={filter} onChange={(event) => onFilter(event.target.value)} aria-label="Filter ujian"><option>Semua ujian</option><option>Belum dikerjakan</option><option>Selesai</option></select><ChevronDown size={14} /></label></div>
    {hasProgress && <button className="resume-banner" onClick={onStart}><span><Clock3 size={19} /></span><div><b>Ujianmu masih tersimpan</b><small>Lanjutkan dari jawaban terakhir yang tersimpan di browser ini.</small></div><ArrowRight size={18} /></button>}
    <div className="student-exam-grid">
      {filter !== 'Selesai' && <article className="student-exam-card featured-exam"><div className="exam-card-art math-art"><div className="math-shape shape-a">x²</div><div className="math-shape shape-b">+</div><div className="math-shape shape-c">π</div><span className="math-tag">PENILAIAN AKHIR</span></div><div className="student-exam-info"><div className="exam-meta-row"><span className="subject-chip math-chip">Matematika</span><span className="exam-date-label"><CalendarDays size={13} /> 12 Nov 2026</span></div><h3>Penilaian Bab 3</h3><p>Persamaan kuadrat, bangun datar, dan statistika.</p><div className="exam-card-footer"><span><FileCheck2 size={14} /> 6 soal</span><span><Clock3 size={14} /> 20 menit</span><button className="student-primary" onClick={onStart}>{hasProgress ? 'Lanjutkan' : 'Mulai ujian'} <ArrowRight size={15} /></button></div></div></article>}
      {filter !== 'Selesai' && <article className="student-exam-card"><div className="exam-card-art english-art"><div className="english-circle circle-left">A</div><div className="english-circle circle-right">文</div><span className="english-small">LANGUAGE QUIZ</span></div><div className="student-exam-info"><div className="exam-meta-row"><span className="subject-chip english-chip">Bahasa Inggris</span><span className="exam-date-label"><CalendarDays size={13} /> 14 Nov 2026</span></div><h3>Daily Conversation</h3><p>Latihan ungkapan sehari-hari dan pemahaman dialog.</p><div className="exam-card-footer"><span><FileCheck2 size={14} /> 10 soal</span><span><Clock3 size={14} /> 30 menit</span><button className="student-quiet-button" disabled>Belum dibuka <LockKeyhole size={13} /></button></div></div></article>}
      {filter !== 'Belum dikerjakan' && <article className="student-exam-card completed-card"><div className="exam-card-art literacy-art"><div className="literacy-book"><BookOpen size={43} /></div><span className="literacy-label">CERITA & IDE</span></div><div className="student-exam-info"><div className="exam-meta-row"><span className="subject-chip literacy-chip">Bahasa Indonesia</span><span className="completed-label"><CheckCircle2 size={13} /> Selesai</span></div><h3>Memahami Teks Narasi</h3><p>Mengenali tokoh, alur, dan pesan dalam sebuah cerita.</p><div className="exam-card-footer"><span><FileCheck2 size={14} /> 8 soal</span><span className="result-score">Nilai <b>92</b></span><button className="student-quiet-button review-button" onClick={() => onMessage('Hasil latihan contoh: nilai 92 dari 100.')}>Lihat hasil <ArrowRight size={14} /></button></div></div></article>}
    </div>
    {showTip && <section className="study-tip"><span className="tip-icon"><Info size={17} /></span><div><b>Tips sebelum ujian</b><p>Pastikan koneksi internet stabil dan siapkan alat tulis. Jawaban akan tersimpan otomatis di browser ini.</p></div><button aria-label="Tutup tips" onClick={() => setShowTip(false)}><X size={16} /></button></section>}
    <footer className="student-footer"><span>© 2026 ExamPortal</span><span><ShieldCheck size={13} /> Ruang ujian aman dan nyaman</span></footer>
  </main>;
}

function BarIcon() { return <span className="tiny-bars"><i/><i/><i/></span>; }

function ExamWorkspace({ currentQuestion, answers, secondsLeft, onChoose, onNavigate, onSubmit, onExit }: { currentQuestion: number; answers: Record<number, number>; secondsLeft: number; onChoose: (index: number) => void; onNavigate: (index: number) => void; onSubmit: () => void; onExit: () => void }) {
  const question = questions[currentQuestion];
  const answered = Object.keys(answers).length;
  const progress = (answered / questions.length) * 100;
  return <main className="exam-workspace"><div className="exam-workspace-top"><button className="back-home" onClick={onExit}><ArrowLeft size={15} /> Kembali ke beranda</button><span className="autosave-indicator"><span className="save-dot" /> Progres tersimpan otomatis</span></div><div className="exam-main-grid"><section className="question-panel"><div className="question-panel-top"><div><span className="question-subject">MATEMATIKA <i>·</i> PENILAIAN BAB 3</span><h1>Kerjakan dengan teliti, ya!</h1></div><span className={`timer-large ${secondsLeft < 120 ? 'timer-warning' : ''}`}><Clock3 size={15} /> {formatTime(secondsLeft)}</span></div><div className="question-progress-row"><span>Soal <b>{currentQuestion + 1}</b> <i>dari</i> {questions.length}</span><span>{answered} dijawab</span></div><div className="question-progress-track"><span style={{ width: `${progress}%` }} /></div><div className="question-body"><span className="question-number">PERTANYAAN {String(currentQuestion + 1).padStart(2, '0')}</span><h2>{question.prompt}</h2><p className="choose-instruction">Pilih satu jawaban yang paling tepat.</p><div className="answer-options">{question.options.map((option, index) => <button key={option} className={`answer-option ${answers[currentQuestion] === index ? 'chosen' : ''}`} onClick={() => onChoose(index)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{answers[currentQuestion] === index && <Check size={16} className="answer-check" />}</button>)}</div></div><div className="question-navigation"><button className="secondary-button" disabled={currentQuestion === 0} onClick={() => onNavigate(currentQuestion - 1)}><ArrowLeft size={15} /> Sebelumnya</button><span>{currentQuestion + 1} / {questions.length}</span>{currentQuestion < questions.length - 1 ? <button className="student-primary" onClick={() => onNavigate(currentQuestion + 1)}>Soal berikutnya <ArrowRight size={15} /></button> : <button className="student-primary" onClick={onSubmit}>Kumpulkan <Send size={14} /></button>}</div></section><aside className="question-sidebar"><div className="question-sidebar-heading"><h2>Nomor soal</h2><button aria-label="Petunjuk" title="Pilih nomor soal untuk berpindah"><CircleHelp size={16} /></button></div><p>Ketuk nomor untuk berpindah soal.</p><div className="question-number-grid">{questions.map((_, index) => <button key={index} className={`question-number-button ${index === currentQuestion ? 'current' : ''} ${answers[index] !== undefined ? 'answered' : ''}`} onClick={() => onNavigate(index)}>{String(index + 1).padStart(2, '0')}{answers[index] !== undefined && <i />}</button>)}</div><div className="question-legend"><span><i className="legend-current" />Sedang dibuka</span><span><i className="legend-answered" />Sudah dijawab</span><span><i className="legend-unanswered" />Belum dijawab</span></div><div className="sidebar-progress"><div className="sidebar-progress-text"><span>Progres ujian</span><b>{answered}/{questions.length}</b></div><div className="sidebar-track"><span style={{ width: `${progress}%` }} /></div><small>{answered === questions.length ? 'Semua soal telah dijawab.' : `${questions.length - answered} soal belum dijawab`}</small></div><div className="exam-security-note"><ShieldCheck size={16} /><span>Jawaban tersimpan otomatis pada perangkat ini.</span></div><button className="submit-exam-button" onClick={onSubmit}>Kumpulkan ujian <ArrowRight size={15} /></button></aside></div><div className="exam-workspace-footer"><span><LockKeyhole size={13} /> Jangan tutup halaman sampai ujian selesai</span><span>Penilaian Bab 3 <i>·</i> Matematika</span></div></main>;
}

function ResultPage({ score, answers, onHome, onRetry }: { score: number; answers: Record<number, number>; onHome: () => void; onRetry: () => void }) {
  const percentage = Math.round((score / questions.length) * 100);
  return <main className="result-page"><div className="result-card"><div className="result-confetti"><span>✦</span><span>✧</span><span>•</span><span>✦</span><div className="result-icon"><CheckCircle2 size={36} /></div></div><span className="section-eyebrow">PENILAIAN BAB 3 · MATEMATIKA</span><h1>Ujian selesai!</h1><p>Terima kasih sudah mengerjakan dengan sungguh-sungguh, Raka.</p><div className="score-circle" style={{ background: `conic-gradient(#48ab83 0 ${percentage}%, #eaf4ef ${percentage}% 100%)` }}><div><b>{percentage}</b><small>dari 100</small></div></div><div className="result-counts"><div><b>{score}</b><span>Jawaban benar</span></div><i/><div><b>{questions.length - score}</b><span>Perlu dipelajari</span></div><i/><div><b>{questions.length}</b><span>Total soal</span></div></div><div className="result-message"><span>{percentage >= 80 ? '✨' : '📘'}</span><div><b>{percentage >= 80 ? 'Hasil yang hebat!' : 'Terus berlatih, ya!'}</b><small>{percentage >= 80 ? 'Pemahamanmu sudah kuat. Pertahankan semangat belajarmu.' : 'Yuk, pelajari lagi pembahasan untuk memahami materi lebih baik.'}</small></div></div><div className="result-actions"><button className="secondary-button" onClick={onHome}>Kembali ke beranda</button><button className="student-primary" onClick={onRetry}>Coba lagi <ArrowRight size={15} /></button></div></div><section className="review-panel"><div className="review-heading"><div><span className="section-eyebrow">RINGKASAN JAWABAN</span><h2>Yuk, pelajari lagi</h2></div><span>{score}/{questions.length} benar</span></div>{questions.map((question, index) => { const correct = answers[index] === question.answer; return <article className="review-item" key={question.prompt}><div className={`review-result-icon ${correct ? 'correct' : 'incorrect'}`}>{correct ? <Check size={15} /> : <X size={15} />}</div><div className="review-copy"><b>Soal {index + 1}: {question.prompt}</b><p>Jawaban benar: <strong>{question.options[question.answer]}</strong>{answers[index] !== undefined && !correct && <span> · Jawabanmu: {question.options[answers[index]]}</span>}</p><small>{question.explanation}</small></div><span className={correct ? 'review-status good' : 'review-status needs-work'}>{correct ? 'Benar' : 'Pelajari'}</span></article>; })}</section><footer className="student-footer"><span>© 2026 ExamPortal</span><span><ShieldCheck size={13} /> Sesi latihan tersimpan di browser</span></footer></main>;
}

export default App;
