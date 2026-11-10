import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  GraduationCap,
  Home,
  Info,
  ListChecks,
  LockKeyhole,
  LogOut,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api, type Attempt, type ExamSummary, type ReviewQuestion, type User } from './api';

type ExamScreen = 'home' | 'grades' | 'exam' | 'result';
type SaveState = 'saved' | 'saving' | 'error';

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState('');
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [screen, setScreen] = useState<ExamScreen>('home');
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [result, setResult] = useState<Attempt['result'] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [submitting, setSubmitting] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showQuestionHelp, setShowQuestionHelp] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [filter, setFilter] = useState('Semua ujian');
  const [toast, setToast] = useState('');
  const autoSubmitStarted = useRef(false);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());

  function persistAnswers(attemptId: string, nextAnswers: Record<number, number>) {
    const pending = saveQueue.current.catch(() => undefined).then(() => api.saveAnswers(attemptId, nextAnswers));
    saveQueue.current = pending.catch(() => undefined);
    return pending;
  }

  async function refreshExams() {
    setDataLoading(true);
    try {
      const response = await api.exams();
      setExams(response.exams);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Daftar ujian gagal dimuat.');
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api.me().then(async ({ user: currentUser }) => {
      if (cancelled) return;
      if (currentUser && currentUser.role !== 'student') {
        await api.logout().catch(() => undefined);
        setAuthNotice('Sesi pengajar sudah dikeluarkan. Masuk dengan akun siswa.');
        return;
      }
      setUser(currentUser);
      if (currentUser) {
        const response = await api.exams();
        if (!cancelled) setExams(response.exams);
      }
    }).catch((error: unknown) => {
      if (!cancelled) setAuthNotice(error instanceof Error ? error.message : 'Backend belum dapat dihubungi.');
    }).finally(() => {
      if (!cancelled) setAuthLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (screen !== 'exam' || !attempt || attempt.status !== 'in_progress') return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((attempt.expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !autoSubmitStarted.current) void finishExam();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [screen, attempt?.id, attempt?.expiresAt, attempt?.status, answers, submitting]);

  useEffect(() => {
    if (screen !== 'exam' || !attempt || attempt.status !== 'in_progress' || submitting) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      persistAnswers(attempt.id, answers).then(() => setSaveState('saved')).catch(async (error: unknown) => {
        setSaveState('error');
        setToast(error instanceof Error ? error.message : 'Jawaban belum dapat disimpan.');
        if (error instanceof Error && /waktu ujian sudah habis/i.test(error.message)) {
          try {
            const latest = await api.getAttempt(attempt.id);
            if (latest.attempt.status === 'submitted') {
              setAttempt(latest.attempt);
              setResult(latest.attempt.result ?? null);
              setScreen('result');
            }
          } catch { /* pesan simpan tetap ditampilkan */ }
        }
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [screen, attempt?.id, answers, submitting]);

  const answeredCount = Object.keys(answers).length;

  async function beginAuthentication(nextUser: User) {
    setUser(nextUser);
    setAuthNotice('');
    setScreen('home');
    await refreshExams();
  }

  async function logout() {
    try { await api.logout(); } catch { /* sesi mungkin sudah kedaluwarsa */ }
    setUser(null);
    setExams([]);
    setAttempt(null);
    setResult(null);
    setScreen('home');
    setShowActivity(false);
    setShowQuestionHelp(false);
    setAuthNotice('Anda sudah keluar dari akun.');
  }

  async function startExam(exam: ExamSummary) {
    try {
      const response = exam.attempt && exam.attempt.status !== 'submitted'
        ? await api.getAttempt(exam.attempt.id)
        : await api.startAttempt(exam.id);
      const nextAttempt = response.attempt;
      setAttempt(nextAttempt);
      setAnswers(nextAttempt.answers || {});
      setCurrentQuestion(0);
      setShowSubmit(false);
      autoSubmitStarted.current = false;
      if (nextAttempt.status !== 'in_progress') {
        setResult(nextAttempt.result ?? null);
        setScreen('result');
        await refreshExams();
      } else {
        setResult(null);
        setSecondsLeft(Math.max(0, Math.ceil((nextAttempt.expiresAt - Date.now()) / 1000)));
        setScreen('exam');
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Ujian tidak dapat dimulai.');
      if (exam.attempt?.id) {
        try {
          const latest = await api.getAttempt(exam.attempt.id);
          if (latest.attempt.status === 'submitted') {
            setAttempt(latest.attempt);
            setResult(latest.attempt.result ?? null);
            setScreen('result');
            await refreshExams();
          }
        } catch { /* tampilkan pesan awal */ }
      }
    }
  }

  async function reviewAttempt(attemptId: string) {
    try {
      const response = await api.getAttempt(attemptId);
      setAttempt(response.attempt);
      setAnswers(response.attempt.answers || {});
      setResult(response.attempt.result ?? null);
      setScreen(response.attempt.status === 'submitted' ? 'result' : 'exam');
      if (response.attempt.status === 'in_progress') setSecondsLeft(Math.max(0, Math.ceil((response.attempt.expiresAt - Date.now()) / 1000)));
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Hasil ujian gagal dimuat.');
    }
  }

  async function finishExam() {
    if (!attempt || autoSubmitStarted.current || submitting) return;
    autoSubmitStarted.current = true;
    setSubmitting(true);
    try {
      await saveQueue.current.catch(() => undefined);
      const response = await api.submitAttempt(attempt.id, answers);
      setAttempt(response.attempt);
      setResult(response.attempt.result ?? null);
      setShowSubmit(false);
      setShowQuestionHelp(false);
      setScreen('result');
      setSaveState('saved');
      await refreshExams();
    } catch (error) {
      autoSubmitStarted.current = false;
      setToast(error instanceof Error ? error.message : 'Jawaban belum dapat dikumpulkan.');
    } finally {
      setSubmitting(false);
    }
  }

  async function exitExam() {
    if (!attempt || attempt.status !== 'in_progress') {
      returnHome();
      return;
    }
    setSubmitting(true);
    setSaveState('saving');
    try {
      await persistAnswers(attempt.id, answers);
      setSaveState('saved');
      setShowQuestionHelp(false);
      setScreen('home');
      await refreshExams();
    } catch (error) {
      setSaveState('error');
      setToast(error instanceof Error ? error.message : 'Jawaban belum dapat disimpan. Tetap di halaman ujian dan coba lagi.');
      if (error instanceof Error && /waktu ujian sudah habis/i.test(error.message)) {
        try {
          const latest = await api.getAttempt(attempt.id);
          if (latest.attempt.status === 'submitted') {
            setAttempt(latest.attempt);
            setResult(latest.attempt.result ?? null);
            setScreen('result');
            await refreshExams();
          }
        } catch { /* siswa tetap berada di ujian jika hasil belum dapat dimuat */ }
      }
    } finally {
      setSubmitting(false);
    }
  }

  function returnHome() {
    setScreen('home');
    setShowSubmit(false);
    setShowQuestionHelp(false);
    setShowActivity(false);
    setAttempt(null);
    setResult(null);
    setAnswers({});
    setCurrentQuestion(0);
    autoSubmitStarted.current = false;
  }

  function chooseAnswer(optionIndex: number) {
    setAnswers((current) => ({ ...current, [currentQuestion]: optionIndex }));
  }

  if (authLoading) return <div className="portal-loading"><span className="portal-brand-mark"><GraduationCap size={21} /></span><b>Memeriksa sesi siswa…</b></div>;
  if (!user) return <AuthScreen notice={authNotice} onAuthenticated={(nextUser) => { void beginAuthentication(nextUser); }} />;

  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
  const activeQuestions = attempt && attempt.status === 'in_progress' ? attempt.questions : [];
  const currentQuestionData = activeQuestions[currentQuestion];
  const shownQuestionCount = activeQuestions.length;
  const percentageAnswered = shownQuestionCount ? (answeredCount / shownQuestionCount) * 100 : 0;

  return <div className="portal-shell">
    <header className="portal-header">
      <a className="portal-brand" href="#home" onClick={(event) => { event.preventDefault(); if (screen !== 'exam') returnHome(); }}><span className="portal-brand-mark"><GraduationCap size={21} /></span><span>exam<span>portal</span><small>RUANG BELAJAR SISWA</small></span></a>
      {screen === 'exam' ? <div className="exam-top-label"><LockKeyhole size={14} /> {attempt?.exam.title || 'Ujian'} <span>·</span> {attempt?.exam.subject || 'Sesi aman'}</div> : <nav className="portal-nav"><button className={screen === 'home' ? 'portal-nav-active' : ''} onClick={() => { setShowActivity(false); setFilter('Semua ujian'); returnHome(); void refreshExams(); }}><Home size={15} /> Beranda</button><button className={screen === 'grades' ? 'portal-nav-active' : ''} onClick={() => { setShowActivity(false); setScreen('grades'); void refreshExams(); }}><ListChecks size={15} /> Nilai saya</button></nav>}
      <div className="portal-header-right">{screen === 'exam' ? <div className={`header-timer ${secondsLeft < 120 ? 'timer-warning' : ''}`}><Clock3 size={15} /><span>{formatTime(secondsLeft)}</span></div> : <div className="activity-menu"><button className="portal-icon-button" aria-label="Aktivitas ujian" aria-expanded={showActivity} onClick={() => { setShowActivity((open) => !open); if (!showActivity) void refreshExams(); }}><Bell size={18} />{exams.some((exam) => !exam.attempt || exam.attempt.status === 'in_progress') && <i />}</button>{showActivity && <ActivityPanel exams={exams} onDismiss={() => setShowActivity(false)} onStart={(exam) => { setShowActivity(false); void startExam(exam); }} onReview={(id) => { setShowActivity(false); void reviewAttempt(id); }} onGoHome={() => { setShowActivity(false); setFilter('Belum dikerjakan'); returnHome(); }} onGoGrades={() => { setShowActivity(false); setScreen('grades'); void refreshExams(); }} />}</div>}<div className="student-profile"><span className="student-avatar">{initials || 'S'}</span><span className="student-name">{user.name}<small>Siswa</small></span><button className="portal-logout" onClick={() => void logout()} aria-label="Keluar" title="Keluar"><LogOut size={15} /></button></div></div>
    </header>

    {screen === 'home' && <StudentHome user={user} exams={exams} filter={filter} onFilter={setFilter} onStart={(exam) => void startExam(exam)} onReview={(id) => void reviewAttempt(id)} onMessage={setToast} loading={dataLoading} />}
    {screen === 'grades' && <StudentGrades exams={exams} loading={dataLoading} onReview={(id) => void reviewAttempt(id)} onHome={returnHome} />}
    {screen === 'exam' && currentQuestionData && attempt && <ExamWorkspace exam={attempt.exam} question={currentQuestionData} questionCount={shownQuestionCount} currentQuestion={currentQuestion} answers={answers} secondsLeft={secondsLeft} progress={percentageAnswered} saveState={submitting ? 'saving' : saveState} submitting={submitting} onChoose={chooseAnswer} onNavigate={setCurrentQuestion} onSubmit={() => setShowSubmit(true)} onHelp={() => setShowQuestionHelp(true)} onExit={() => { setShowSubmit(false); void exitExam(); }} />}
    {screen === 'result' && result && attempt && <ResultPage exam={attempt.exam} userName={user.name} result={result} onHome={returnHome} />}
    {screen === 'result' && (!result || !attempt) && <main className="result-page"><div className="empty-state">Hasil belum tersedia. Kembali ke beranda dan muat ulang ujian.</div><button className="student-primary" onClick={returnHome}>Kembali ke beranda <ArrowRight size={15} /></button></main>}

    {showSubmit && <div className="portal-modal-backdrop"><section className="submit-modal" role="dialog" aria-modal="true" aria-labelledby="submit-title"><button className="modal-close" aria-label="Tutup" onClick={() => setShowSubmit(false)}><X size={18} /></button><div className="submit-modal-icon"><Send size={21} /></div><h2 id="submit-title">Kumpulkan jawaban?</h2><p>Kamu sudah menjawab <b>{answeredCount} dari {shownQuestionCount} soal</b>. Setelah dikumpulkan, jawaban tidak dapat diubah.</p><div className="submit-modal-actions"><button className="secondary-button" onClick={() => setShowSubmit(false)}>Periksa lagi</button><button className="student-primary" disabled={submitting} onClick={() => void finishExam()}>{submitting ? 'Mengumpulkan…' : 'Ya, kumpulkan'} <ArrowRight size={16} /></button></div></section></div>}
    {showQuestionHelp && <QuestionHelpModal onClose={() => setShowQuestionHelp(false)} />}
    {toast && <div className="portal-toast"><CheckCircle2 size={16} />{toast}</div>}
  </div>;
}

function AuthScreen({ notice, onAuthenticated }: { notice: string; onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setWorking(true);
    try {
      const response = mode === 'login' ? await api.login(email, password) : await api.register(name, email, password);
      onAuthenticated(response.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Tidak dapat memproses akun.');
    } finally {
      setWorking(false);
    }
  }

  return <main className="portal-auth-shell">
    <section className="portal-auth-card">
      <div className="portal-auth-brand"><span className="portal-brand-mark"><GraduationCap size={21} /></span><span>exam<span>portal</span><small>RUANG BELAJAR SISWA</small></span></div>
      <p className="portal-auth-eyebrow">AKUN SISWA</p>
      <h1>{mode === 'login' ? 'Siap lanjut belajar?' : 'Buat akun siswa'}</h1>
      <p className="portal-auth-description">Masuk untuk melihat jadwal ujian, melanjutkan progres, dan menyimpan hasil belajarmu.</p>
      {notice && <div className="portal-auth-notice">{notice}</div>}
      <form className="portal-auth-form" onSubmit={(event) => void submit(event)}>
        {mode === 'register' && <label>Nama lengkap<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={100} placeholder="Nama Anda" /></label>}
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="nama@email.com" /></label>
        <label>Kata sandi<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 10 : 1} maxLength={200} placeholder={mode === 'register' ? 'Minimal 10 karakter' : 'Kata sandi Anda'} /></label>
        {error && <p className="portal-auth-error" role="alert">{error}</p>}
        <button className="portal-auth-submit" disabled={working}>{working ? 'Memproses…' : mode === 'login' ? 'Masuk ke portal' : 'Daftar sebagai siswa'} <ArrowRight size={16} /></button>
      </form>
      <p className="portal-auth-switch">{mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Daftar' : 'Masuk'}</button></p>
      <div className="portal-auth-security"><LockKeyhole size={15} /> Jawaban dan nilai diproses oleh server, bukan browser.</div>
    </section>
  </main>;
}

function StudentHome({ user, exams, filter, onFilter, onStart, onReview, onMessage, loading }: {
  user: User;
  exams: ExamSummary[];
  filter: string;
  onFilter: (filter: string) => void;
  onStart: (exam: ExamSummary) => void;
  onReview: (id: string) => void;
  onMessage: (message: string) => void;
  loading: boolean;
}) {
  const [showTip, setShowTip] = useState(true);
  const done = exams.filter((exam) => exam.attempt?.status === 'submitted');
  const scores = done.map((exam) => exam.attempt?.score ?? 0);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const shown = exams.filter((exam) => {
    if (filter === 'Belum dikerjakan') return !exam.attempt || exam.attempt.status !== 'submitted';
    if (filter === 'Selesai') return exam.attempt?.status === 'submitted' || exam.attempt?.status === 'expired';
    return true;
  });
  return <main className="student-main">
    <div className="welcome-banner"><div className="welcome-copy"><span className="welcome-date">RUANG BELAJAR SISWA</span><h1>Hai, {user.name.split(' ')[0]}! Siap belajar hari ini?</h1><p>Periksa jadwal ujianmu dan lanjutkan progres yang tersimpan di server.</p><div className="welcome-chips"><span><CheckCircle2 size={14} /> {done.length} ujian selesai</span><span><Clock3 size={14} /> {exams.filter((exam) => exam.attempt?.status === 'in_progress').length} ujian berlangsung</span></div></div><div className="welcome-graphic" aria-hidden="true"><div className="graphic-sun"/><div className="graphic-book"><BookOpen size={50} strokeWidth={1.3} /></div><span className="graphic-sparkle sparkle-one">✦</span><span className="graphic-sparkle sparkle-two">✧</span><span className="graphic-line line-one"/><span className="graphic-line line-two"/></div></div>
    <section className="student-stats"><div className="student-stat"><span className="student-stat-icon purple"><BookOpen size={17} /></span><div><b>{exams.length}</b><span>Total ujian</span></div><small>tersedia untukmu</small></div><div className="student-stat"><span className="student-stat-icon green"><Check size={17} /></span><div><b>{done.length}</b><span>Selesai</span></div><small>tersimpan di server</small></div><div className="student-stat"><span className="student-stat-icon orange"><BarIcon /></span><div><b>{average ?? '—'}</b><span>Rata-rata nilai</span></div><small>{done.length ? 'nilai aktual' : 'belum ada hasil'}</small></div></section>
    <div className="student-section-heading"><div><span className="section-eyebrow">RINGKASAN KELAS</span><h2>Ujian untukmu</h2><p>Ujian terbit dari pengajar akan muncul di sini.</p></div><label className="exam-filter"><select value={filter} onChange={(event) => onFilter(event.target.value)} aria-label="Filter ujian"><option>Semua ujian</option><option>Belum dikerjakan</option><option>Selesai</option></select><ChevronDown size={14} /></label></div>
    {loading && <div className="empty-state">Memuat daftar ujian dari server…</div>}
    {!loading && shown.length === 0 && <div className="student-empty"><BookOpen size={25} /><b>{filter === 'Selesai' ? 'Belum ada nilai' : 'Belum ada ujian tersedia'}</b><span>{filter === 'Selesai' ? 'Hasil ujian yang dikumpulkan akan tercatat di sini.' : 'Minta pengajarmu menerbitkan ujian untuk kelasmu.'}</span></div>}
    <div className="student-exam-grid">
      {shown.map((exam, index) => {
        const submitted = exam.attempt?.status === 'submitted' || exam.attempt?.status === 'expired';
        const inProgress = exam.attempt?.status === 'in_progress';
        const artClass = index % 3 === 0 ? 'math-art' : index % 3 === 1 ? 'english-art' : 'literacy-art';
        return <article className={`student-exam-card ${submitted ? 'completed-card' : ''}`} key={exam.id}>
          <div className={`exam-card-art ${artClass}`}>
            {artClass === 'math-art' ? <><div className="math-shape shape-a">x²</div><div className="math-shape shape-b">+</div><div className="math-shape shape-c">π</div><span className="math-tag">UJIAN</span></> : artClass === 'english-art' ? <><div className="english-circle circle-left">A</div><div className="english-circle circle-right">文</div><span className="english-small">{exam.subject.toUpperCase()}</span></> : <><div className="literacy-book"><BookOpen size={43} /></div><span className="literacy-label">{exam.subject.toUpperCase()}</span></>}
          </div>
          <div className="student-exam-info">
            <div className="exam-meta-row"><span className="subject-chip math-chip">{exam.subject}</span>{submitted ? <span className="completed-label"><CheckCircle2 size={13} /> Selesai</span> : <span className="exam-date-label"><CalendarDays size={13} /> {formatDate(exam.date)}</span>}</div>
            <h3>{exam.title}</h3><p>{exam.grade} · Diterbitkan oleh pengajar.</p>
            <div className="exam-card-footer"><span><FileCheck2 size={14} /> {exam.questionCount} soal</span><span><Clock3 size={14} /> {exam.duration} menit</span>
              {submitted ? <><span className="result-score">Nilai <b>{exam.attempt?.score ?? '—'}</b></span><button className="student-quiet-button review-button" onClick={() => exam.attempt?.id && onReview(exam.attempt.id)}>Lihat hasil <ArrowRight size={14} /></button></> : <button className="student-primary" onClick={() => onStart(exam)}>{inProgress ? 'Lanjutkan' : 'Mulai ujian'} <ArrowRight size={15} /></button>}
            </div>
          </div>
        </article>;
      })}
    </div>
    {showTip && <section className="study-tip"><span className="tip-icon"><Info size={17} /></span><div><b>Tips sebelum ujian</b><p>Jawabanmu tersimpan otomatis di server. Waktu ujian dihitung dari server, jadi jangan membagikan akunmu kepada orang lain.</p></div><button aria-label="Tutup tips" onClick={() => setShowTip(false)}><X size={16} /></button></section>}
    <footer className="student-footer"><span>© 2026 ExamPortal</span><span><ShieldCheck size={13} /> Sesi dan jawaban tersimpan di server</span></footer>
    {exams.length > 0 && shown.length === 0 && filter === 'Belum dikerjakan' && <button className="text-button" onClick={() => onMessage('Semua ujian yang tersedia sudah selesai.')}>Semua ujian sudah selesai</button>}
  </main>;
}

function StudentGrades({ exams, loading, onReview, onHome }: {
  exams: ExamSummary[];
  loading: boolean;
  onReview: (id: string) => void;
  onHome: () => void;
}) {
  const completed = exams.filter((exam) => exam.attempt?.status === 'submitted' || exam.attempt?.status === 'expired');
  const scored = completed.map((exam) => exam.attempt?.score).filter((score): score is number => score !== null && score !== undefined);
  const average = scored.length ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length) : null;
  const best = scored.length ? Math.max(...scored) : null;

  return <main className="student-main grades-main">
    <div className="grades-heading"><div><span className="section-eyebrow">HASIL BELAJAR</span><h1>Nilai saya</h1><p>Ringkasan hasil ujian yang tersimpan untuk akunmu.</p></div><button className="secondary-button" onClick={onHome}><Home size={14} /> Kembali ke beranda</button></div>
    <section className="student-stats grades-stats"><div className="student-stat"><span className="student-stat-icon purple"><FileCheck2 size={17} /></span><div><b>{scored.length}</b><span>Ujian dinilai</span></div><small>riwayat hasil</small></div><div className="student-stat"><span className="student-stat-icon green"><Check size={17} /></span><div><b>{average ?? '—'}</b><span>Rata-rata nilai</span></div><small>skala 0–100</small></div><div className="student-stat"><span className="student-stat-icon orange"><BarIcon /></span><div><b>{best ?? '—'}</b><span>Nilai tertinggi</span></div><small>skala 0–100</small></div></section>
    <div className="grade-list-heading"><div><span className="section-eyebrow">RIWAYAT UJIAN</span><h2>Hasil dan pembahasan</h2></div><span>{completed.length} ujian</span></div>
    {loading && <div className="empty-state">Memuat nilai dari server…</div>}
    {!loading && completed.length === 0 && <div className="student-empty"><FileCheck2 size={25} /><b>Belum ada nilai</b><span>Setelah kamu mengumpulkan ujian, hasil dan pembahasannya akan muncul di sini.</span><button className="student-primary" onClick={onHome}>Lihat ujian <ArrowRight size={14} /></button></div>}
    <div className="grade-list">{completed.map((exam) => {
      const score = exam.attempt?.score;
      const expired = exam.attempt?.status === 'expired';
      return <article className="grade-card" key={exam.id}>
        <div className="grade-card-copy"><div className="exam-meta-row"><span className="subject-chip math-chip">{exam.subject}</span><span className={`grade-status ${expired ? 'grade-expired' : ''}`}>{expired ? 'Waktu habis' : 'Selesai'}</span></div><h3>{exam.title}</h3><p>{exam.grade} · {formatDate(exam.date)} · {exam.questionCount} soal</p><div className="grade-track"><span style={{ width: `${Math.min(100, Math.max(0, score ?? 0))}%` }} /></div></div>
        <div className="grade-card-result"><b>{score ?? '—'}<small>{score === null || score === undefined ? '' : '/100'}</small></b><button className="student-quiet-button review-button" disabled={!exam.attempt?.id} onClick={() => exam.attempt?.id && onReview(exam.attempt.id)}>Lihat hasil <ArrowRight size={14} /></button></div>
      </article>;
    })}</div>
    <footer className="student-footer"><span>© 2026 ExamPortal</span><span><ShieldCheck size={13} /> Nilai bersumber dari hasil yang disimpan server</span></footer>
  </main>;
}

function ActivityPanel({ exams, onDismiss, onStart, onReview, onGoHome, onGoGrades }: {
  exams: ExamSummary[];
  onDismiss: () => void;
  onStart: (exam: ExamSummary) => void;
  onReview: (id: string) => void;
  onGoHome: () => void;
  onGoGrades: () => void;
}) {
  const inProgress = exams.filter((exam) => exam.attempt?.status === 'in_progress');
  const completed = exams.filter((exam) => exam.attempt?.status === 'submitted' || exam.attempt?.status === 'expired');
  const availableCount = exams.filter((exam) => !exam.attempt).length;
  const hasItems = inProgress.length + completed.length + availableCount > 0;

  return <aside className="activity-popover" aria-label="Aktivitas ujian">
    <div className="activity-popover-heading"><div><b>Aktivitas ujian</b><small>Informasi terbaru dari akunmu</small></div><button aria-label="Tutup aktivitas" onClick={onDismiss}><X size={16} /></button></div>
    {!hasItems && <p className="activity-empty">Belum ada aktivitas. Ujian yang tersedia akan muncul di beranda.</p>}
    {inProgress.slice(0, 3).map((exam) => <article className="activity-item" key={`progress-${exam.id}`}><span className="activity-icon activity-icon-progress"><Clock3 size={15} /></span><div><b>Ujian belum selesai</b><small>{exam.title}</small><button onClick={() => onStart(exam)}>Lanjutkan ujian <ArrowRight size={12} /></button></div></article>)}
    {completed.slice(0, 3).map((exam) => <article className="activity-item" key={`result-${exam.id}`}><span className="activity-icon activity-icon-result"><CheckCircle2 size={15} /></span><div><b>Hasil ujian tersedia</b><small>{exam.title}{exam.attempt?.score === null ? '' : ` · Nilai ${exam.attempt?.score}`}</small><button disabled={!exam.attempt?.id} onClick={() => exam.attempt?.id && onReview(exam.attempt.id)}>Lihat hasil <ArrowRight size={12} /></button></div></article>)}
    {availableCount > 0 && <article className="activity-item"><span className="activity-icon activity-icon-new"><BookOpen size={15} /></span><div><b>{availableCount} ujian tersedia</b><small>Periksa daftar ujian yang belum dikerjakan.</small><button onClick={onGoHome}>Lihat ujian <ArrowRight size={12} /></button></div></article>}
    {hasItems && <div className="activity-popover-footer"><button onClick={onGoGrades}>Buka Nilai saya <ArrowRight size={13} /></button></div>}
  </aside>;
}

function QuestionHelpModal({ onClose }: { onClose: () => void }) {
  return <div className="portal-modal-backdrop"><section className="submit-modal help-modal" role="dialog" aria-modal="true" aria-labelledby="question-help-title"><button className="modal-close" aria-label="Tutup petunjuk" onClick={onClose}><X size={18} /></button><div className="submit-modal-icon"><CircleHelp size={21} /></div><h2 id="question-help-title">Petunjuk mengerjakan</h2><p>Pilih nomor di panel samping untuk berpindah soal. Nomor yang sudah dijawab akan ditandai, sementara nomor yang sedang dibuka diberi warna berbeda.</p><p>Jawaban tersimpan otomatis ke server. Periksa kembali soal yang belum terjawab sebelum memilih <b>Kumpulkan ujian</b>; setelah dikumpulkan, jawaban tidak dapat diubah.</p><div className="submit-modal-actions"><button className="student-primary" onClick={onClose}>Mengerti <Check size={15} /></button></div></section></div>;
}

function BarIcon() { return <span className="tiny-bars"><i/><i/><i/></span>; }

function ExamWorkspace({ exam, question, questionCount, currentQuestion, answers, secondsLeft, progress, saveState, submitting, onChoose, onNavigate, onSubmit, onHelp, onExit }: {
  exam: Attempt['exam'];
  question: Attempt['questions'][number];
  questionCount: number;
  currentQuestion: number;
  answers: Record<number, number>;
  secondsLeft: number;
  progress: number;
  saveState: SaveState;
  submitting: boolean;
  onChoose: (index: number) => void;
  onNavigate: (index: number) => void;
  onSubmit: () => void;
  onHelp: () => void;
  onExit: () => void;
}) {
  const answered = Object.keys(answers).length;
  return <main className="exam-workspace"><div className="exam-workspace-top"><button className="back-home" disabled={submitting} onClick={onExit}><ArrowLeft size={15} /> Kembali ke beranda</button><span className={`autosave-indicator ${saveState === 'error' ? 'autosave-error' : ''}`}><span className="save-dot" /> {saveState === 'saving' ? 'Menyimpan ke server…' : saveState === 'error' ? 'Gagal menyimpan' : 'Tersimpan di server'}</span></div><div className="exam-main-grid"><section className="question-panel"><div className="question-panel-top"><div><span className="question-subject">{exam.subject.toUpperCase()} <i>·</i> {exam.title.toUpperCase()}</span><h1>Kerjakan dengan teliti, ya!</h1></div><span className={`timer-large ${secondsLeft < 120 ? 'timer-warning' : ''}`}><Clock3 size={15} /> {formatTime(secondsLeft)}</span></div><div className="question-progress-row"><span>Soal <b>{currentQuestion + 1}</b> <i>dari</i> {questionCount}</span><span>{answered} dijawab</span></div><div className="question-progress-track"><span style={{ width: `${progress}%` }} /></div><div className="question-body"><span className="question-number">PERTANYAAN {String(currentQuestion + 1).padStart(2, '0')}</span><h2>{question.prompt}</h2>{question.imageData && <img className="question-image" src={question.imageData} alt={`Gambar untuk pertanyaan ${currentQuestion + 1}`} />}<p className="choose-instruction">Pilih satu jawaban yang paling tepat.</p><div className="answer-options">{question.options.map((option, index) => <button key={`${question.id}-${index}`} className={`answer-option ${answers[currentQuestion] === index ? 'chosen' : ''}`} disabled={submitting} onClick={() => onChoose(index)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{answers[currentQuestion] === index && <Check size={16} className="answer-check" />}</button>)}</div></div><div className="question-navigation"><button className="secondary-button" disabled={currentQuestion === 0 || submitting} onClick={() => onNavigate(currentQuestion - 1)}><ArrowLeft size={15} /> Sebelumnya</button><span>{currentQuestion + 1} / {questionCount}</span>{currentQuestion < questionCount - 1 ? <button className="student-primary" disabled={submitting} onClick={() => onNavigate(currentQuestion + 1)}>Soal berikutnya <ArrowRight size={15} /></button> : <button className="student-primary" disabled={submitting} onClick={onSubmit}>Kumpulkan <Send size={14} /></button>}</div></section><aside className="question-sidebar"><div className="question-sidebar-heading"><h2>Nomor soal</h2><button aria-label="Petunjuk" title="Pilih nomor soal untuk berpindah" onClick={onHelp}><CircleHelp size={16} /></button></div><p>Ketuk nomor untuk berpindah soal.</p><div className="question-number-grid">{Array.from({ length: questionCount }, (_, index) => <button key={index} className={`question-number-button ${index === currentQuestion ? 'current' : ''} ${answers[index] !== undefined ? 'answered' : ''}`} disabled={submitting} onClick={() => onNavigate(index)}>{String(index + 1).padStart(2, '0')}{answers[index] !== undefined && <i />}</button>)}</div><div className="question-legend"><span><i className="legend-current" />Sedang dibuka</span><span><i className="legend-answered" />Sudah dijawab</span><span><i className="legend-unanswered" />Belum dijawab</span></div><div className="sidebar-progress"><div className="sidebar-progress-text"><span>Progres ujian</span><b>{answered}/{questionCount}</b></div><div className="sidebar-track"><span style={{ width: `${progress}%` }} /></div><small>{answered === questionCount ? 'Semua soal telah dijawab.' : `${questionCount - answered} soal belum dijawab`}</small></div><div className="exam-security-note"><ShieldCheck size={16} /><span>Jawaban dicatat server untuk akun ini.</span></div><button className="submit-exam-button" disabled={submitting} onClick={onSubmit}>Kumpulkan ujian <ArrowRight size={15} /></button></aside></div><div className="exam-workspace-footer"><span><LockKeyhole size={13} /> Jangan tutup halaman sampai ujian selesai</span><span>{exam.title} <i>·</i> {exam.subject}</span></div></main>;
}

function ResultPage({ exam, userName, result, onHome }: {
  exam: Attempt['exam'];
  userName: string;
  result: NonNullable<Attempt['result']>;
  onHome: () => void;
}) {
  const review = result.review as ReviewQuestion[];
  const percentage = result.percentage;
  return <main className="result-page"><div className="result-card"><div className="result-confetti"><span>✦</span><span>✧</span><span>•</span><span>✦</span><div className="result-icon"><CheckCircle2 size={36} /></div></div><span className="section-eyebrow">{exam.title.toUpperCase()} · {exam.subject.toUpperCase()}</span><h1>Ujian selesai!</h1><p>Terima kasih sudah mengerjakan dengan sungguh-sungguh, {userName.split(' ')[0]}.</p><div className="score-circle" style={{ background: `conic-gradient(#48ab83 0 ${percentage}%, #eaf4ef ${percentage}% 100%)` }}><div><b>{percentage}</b><small>dari 100</small></div></div><div className="result-counts"><div><b>{result.correctCount}</b><span>Jawaban benar</span></div><i/><div><b>{result.questionCount - result.correctCount}</b><span>Perlu dipelajari</span></div><i/><div><b>{result.questionCount}</b><span>Total soal</span></div></div><div className="result-message"><span>{percentage >= 80 ? '✨' : '📘'}</span><div><b>{percentage >= 80 ? 'Hasil yang hebat!' : 'Terus berlatih, ya!'}</b><small>Nilai dihitung dan disimpan oleh server.</small></div></div><div className="result-actions"><button className="secondary-button" onClick={onHome}>Kembali ke beranda</button></div></div><section className="review-panel"><div className="review-heading"><div><span className="section-eyebrow">RINGKASAN JAWABAN</span><h2>Yuk, pelajari lagi</h2></div><span>{result.correctCount}/{result.questionCount} benar</span></div>{review.map((question, index) => { const correct = question.correct; return <article className="review-item" key={question.id}><div className={`review-result-icon ${correct ? 'correct' : 'incorrect'}`}>{correct ? <Check size={15} /> : <X size={15} />}</div><div className="review-copy"><b>Soal {index + 1}: {question.prompt}</b>{question.imageData && <img className="question-image review-question-image" src={question.imageData} alt={`Gambar untuk pertanyaan ${index + 1}`} />}<p>Jawaban benar: <strong>{question.options[question.answer]}</strong>{question.selectedAnswer !== null && !correct && <span> · Jawabanmu: {question.options[question.selectedAnswer]}</span>}</p>{question.explanation && <small>{question.explanation}</small>}</div><span className={correct ? 'review-status good' : 'review-status needs-work'}>{correct ? 'Benar' : 'Perlu ditinjau'}</span></article>; })}</section><footer className="student-footer"><span>© 2026 ExamPortal</span><span><ShieldCheck size={13} /> Hasil tersimpan di server</span></footer></main>;
}

export default App;
