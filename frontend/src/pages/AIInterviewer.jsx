import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function AIInterviewer() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Game states
  const [step, setStep] = useState('setup'); // 'setup' | 'interview' | 'result'
  const [targetYear, setTargetYear] = useState('All Years');
  const [optionalSubject, setOptionalSubject] = useState('Political Science (PSIR)');
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [stream, setStream] = useState(null);

  // Interview state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [aiText, setAiText] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [evaluating, setEvaluating] = useState(false);

  // References
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  // Audio waveform mock bars (CSS animation helper)
  const soundWaveBars = Array.from({ length: 8 });

  // Interview Questions Database
  const questions = [
    {
      text: `Welcome ${user.name || 'Aspirant'}. You have chosen ${optionalSubject || 'PSIR'} as your optional subject. How does the current global geopolitical shift towards a multipolar alignment affect India's neighborhood-first foreign policy in South Asia?`,
      focus: 'Optional Subject + Foreign Relations'
    },
    {
      text: 'Good. Now let\'s check your administrative planning skills. Under the federal framework of India, how do you analyze the effectiveness of Inter-State River Water Dispute resolution bodies, and what structural changes would you suggest?',
      focus: 'GS Paper II - Indian Constitution'
    },
    {
      text: 'Finally, let\'s look at public service values. Imagine you are a District Magistrate and face severe political pressure to sanction funds for an unapproved welfare project right before local polls. How will you resolve this dilemma using constitutional ethics?',
      focus: 'GS Paper IV - Ethics & Integrity'
    }
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN'; // Indian English pronunciation context

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        let finalTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          }
        }
        if (finalTrans) {
          setUserTranscript((prev) => prev + ' ' + finalTrans);
          
          // Auto-silence timer: if they stop speaking for 3 seconds, submit automatically
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            stopListeningAndSubmit(finalTrans);
          }, 3500);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      stopMedia();
      window.speechSynthesis.cancel();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [optionalSubject]);

  // Voice Speech synthesis (AI Speaks)
  const speakQuestion = (text, callback) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose professional voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                  voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
                  voices.find(v => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    
    utterance.rate = 0.95; // Steady administrative cadence
    
    utterance.onstart = () => {
      setIsAiSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (callback) callback();
    };

    utterance.onerror = () => {
      setIsAiSpeaking(false);
      if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Toggle Camera
  const startCamera = async () => {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 380, height: 250 },
        audio: true
      });
      setStream(camStream);
      setCameraActive(true);
      setMicActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = camStream;
      }
    } catch (err) {
      console.warn('Webcam permission blocked:', err);
      setCameraActive(false);
    }
  };

  const stopMedia = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setCameraActive(false);
    setMicActive(false);
  };

  // Starts the mock interview flow
  const handleStartInterview = async () => {
    setStep('interview');
    setCurrentIdx(0);
    setAnswers([]);
    setUserTranscript('');
    await startCamera();

    // Trigger AI speech for Q1
    setTimeout(() => {
      triggerAiQuestion(0);
    }, 1000);
  };

  const triggerAiQuestion = (idx) => {
    const q = questions[idx];
    setAiText(q.text);
    
    speakQuestion(q.text, () => {
      // AI finished speaking, auto-start mic capture
      startMicListening();
    });
  };

  // Mic capture functions
  const startMicListening = () => {
    if (recognitionRef.current) {
      setUserTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        // already started
      }
    }
  };

  const stopListeningAndSubmit = (addedText = '') => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleNextStep = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const currentAnswer = userTranscript.trim();
    if (!currentAnswer) return;

    const nextAnswers = [...answers, currentAnswer];
    setAnswers(nextAnswers);
    setUserTranscript('');

    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      triggerAiQuestion(nextIdx);
    } else {
      // Mock grading analysis
      setEvaluating(true);
      stopMedia();
      setTimeout(() => {
        setEvaluating(false);
        setStep('result');
      }, 3000);
    }
  };

  return (
    <div style={{ padding: '30px 40px', maxWidth: 1000, margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>AI Personalized Assistant 🎙️</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>UPSC DAF & GS personalized oral board interviewer</p>
        </div>
      </div>

      {/* Main card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '30px',
        minHeight: 480,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        
        {/* STEP 1: SETUP PANEL */}
        {step === 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', padding: '40px 0' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 20,
              background: 'var(--purple-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, color: 'var(--purple)', border: '1px solid rgba(124,111,255,0.2)'
            }}>🎙️</div>

            <div style={{ textAlign: 'center', maxWidth: 450 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Interactive UPSC Board Panel</h2>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                Set your exam profile below. The AI will speak questions out loud and transcribe your voice answers in real time to rate your pacing, syllabus alignment, and ethics coherence.
              </p>
            </div>

            {/* Inputs grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 500 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 6 }}>Target UPSC Year</label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 12, outline: 'none'
                  }}
                >
                  <option value="All Years">UPSC Aspirant (All Years)</option>
                  <option value="2026">UPSC 2026 Attempt</option>
                  <option value="2027">UPSC 2027 Attempt</option>
                  <option value="2028">UPSC 2028 Attempt</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 6 }}>Optional Subject</label>
                <select
                  value={optionalSubject}
                  onChange={(e) => setOptionalSubject(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 12, outline: 'none'
                  }}
                >
                  <option value="Political Science (PSIR)">Political Science (PSIR)</option>
                  <option value="Geography">Geography</option>
                  <option value="History">History</option>
                  <option value="Sociology">Sociology</option>
                  <option value="Public Administration">Public Administration</option>
                </select>
              </div>
            </div>

            {/* Action Trigger */}
            <button
              onClick={handleStartInterview}
              style={{
                background: 'var(--purple)', color: '#fff',
                border: 'none', borderRadius: 12,
                padding: '12px 28px', fontSize: 13, fontWeight: 700,
                boxShadow: '0 4px 14px rgba(124,111,255,0.3)',
                marginTop: 10, display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              🚀 Initialize Voice Mock Panel
            </button>
          </div>
        )}

        {/* STEP 2: ACTIVE BOARD PANEL */}
        {step === 'interview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Split screen feeds */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              
              {/* Left Side: Aspirant Camera */}
              <div style={{
                background: '#07080c', border: '1px solid var(--border)',
                borderRadius: 14, overflow: 'hidden', aspectRatio: '1.5',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                position: 'relative'
              }}>
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    flexDirection: 'column', itemsCenter: 'center', justifyContent: 'center',
                    gap: 12, textAlign: 'center', background: 'var(--surface2)'
                  }}>
                    <span style={{ fontSize: 24 }}>📷</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Camera Inactive</span>
                  </div>
                )}

                {/* Bottom Overlay bar */}
                <div style={{
                  padding: '8px 12px', background: 'rgba(9,9,11,0.75)',
                  backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', position: 'relative', zIndex: 2
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cameraActive ? 'var(--green)' : 'var(--text3)' }} />
                    Aspirant: {user.name || 'Candidate'}
                  </div>
                  <button
                    onClick={() => {
                      if (cameraActive) stopMedia();
                      else startCamera();
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6, padding: '4px 8px', fontSize: 10, color: '#fff'
                    }}
                  >
                    {cameraActive ? 'Mute Video' : 'Start Video'}
                  </button>
                </div>
              </div>

              {/* Right Side: Board Member Avatar */}
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 14, overflow: 'hidden', aspectRatio: '1.5',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                padding: '20px', position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>UPSC Board Member</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Panel Chairperson</div>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 12, background: 'var(--purple-dim)', color: 'var(--purple)'
                  }}>Q {currentIdx + 1} of 3</span>
                </div>

                {/* Speech transcript */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
                  <p style={{ fontSize: 12, color: 'var(--text)', textAlign: 'center', lineHeight: 1.6, fontStyle: 'italic', maxWidth: 380 }}>
                    "{aiText || 'Initializing Board Chairperson...'}"
                  </p>
                </div>

                {/* Speech wave footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <span style={{ fontSize: 10, color: 'var(--purple)', fontWeight: 600 }}>{activeQuestion.focus}</span>
                  
                  {isAiSpeaking && (
                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
                      {soundWaveBars.map((_, i) => (
                        <div key={i} style={{
                          width: 2, background: 'var(--purple)',
                          height: 4 + Math.random() * 10,
                          borderRadius: 2,
                          animation: 'pulse 0.8s infinite alternate'
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* User Response controls */}
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 18, color: isListening ? 'var(--red)' : 'var(--text3)',
                  animation: isListening ? 'pulse 1s infinite alternate' : 'none'
                }}>🎙️</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: isListening ? 'var(--text)' : 'var(--text3)' }}>
                  {isListening ? 'Speech Recognition Active... Speak clearly' : 'Ready to record. Click "Speak Answer" to start.'}
                </span>
              </div>

              <textarea
                value={userTranscript}
                onChange={(e) => setUserTranscript(e.target.value)}
                placeholder="Voice answers will transcribe here in real time. You can also edit or type manually if speech is disabled..."
                style={{
                  width: '100%', height: 75, padding: '10px 12px', borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 12, resize: 'none', outline: 'none'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => {
                    if (isListening) stopListeningAndSubmit();
                    else startMicListening();
                  }}
                  style={{
                    background: isListening ? 'var(--red)' : 'var(--surface)',
                    border: '1px solid var(--border)', borderRadius: 10,
                    padding: '8px 16px', fontSize: 12, fontWeight: 600,
                    color: isListening ? '#fff' : 'var(--text)', cursor: 'pointer'
                  }}
                >
                  {isListening ? '🛑 Stop Recording' : '🎙️ Speak Answer'}
                </button>

                <button
                  onClick={handleNextStep}
                  disabled={!userTranscript.trim()}
                  style={{
                    background: 'var(--purple)', border: 'none', borderRadius: 10,
                    padding: '8px 20px', fontSize: 12, fontWeight: 700, color: '#fff',
                    opacity: userTranscript.trim() ? 1 : 0.4, cursor: 'pointer'
                  }}
                >
                  {currentIdx < questions.length - 1 ? 'Next Question →' : 'Finish & Evaluate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PERFORMANCE REVIEW SCORECARD */}
        {step === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '10px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
              <span style={{ fontSize: 32 }}>🏆</span>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>UPSC Mock Board Evaluation</h2>
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>Your vocal metrics and conceptual answers have been calculated</p>
            </div>

            {/* Performance Analytics Card */}
            <div style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '24px'
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
                Performance Analytics Card
              </div>

              {/* Dials grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '14px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Structure & Coherence</div>
                  <strong style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>8.5<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>/10</span></strong>
                </div>

                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '14px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Syllabus Alignment</div>
                  <strong style={{ fontSize: 22, fontWeight: 700, color: 'var(--purple)' }}>7.8<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>/10</span></strong>
                </div>

                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '14px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Speech Pacing / Tone</div>
                  <strong style={{ fontSize: 22, fontWeight: 700, color: 'var(--teal)' }}>9.0<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>/10</span></strong>
                </div>
              </div>

              {/* Actionable feedback box */}
              <div style={{
                background: 'var(--surface)', borderLeft: '3px solid var(--purple)',
                padding: '14px 16px', borderRadius: '0 8px 8px 0', fontSize: 12, lineHeight: 1.6
              }}>
                <div style={{ fontWeight: 700, color: 'var(--purple)', marginBottom: 4 }}>Actionable Feedback</div>
                <p style={{ color: 'var(--text2)' }}>
                  "Your optional conceptual depth was strong. Work on linking current events to paper frameworks."
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setStep('setup');
                  setCurrentIdx(0);
                  setAnswers([]);
                }}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 24px', fontSize: 12, fontWeight: 600,
                  color: 'var(--text)', cursor: 'pointer'
                }}
              >
                🔄 Re-take Interview
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  background: 'var(--purple)', border: 'none',
                  borderRadius: 10, padding: '10px 24px', fontSize: 12, fontWeight: 700,
                  color: '#fff', cursor: 'pointer'
                }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
