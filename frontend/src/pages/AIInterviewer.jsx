import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function AIInterviewer() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Page Steps: 'setup' | 'interview' | 'result'
  const [step, setStep] = useState('setup');
  
  // DAF Setup states
  const [candidateName, setCandidateName] = useState(user.name || 'Rithika V');
  const [stateName, setStateName] = useState('Telangana');
  const [optionalSubject, setOptionalSubject] = useState('Geography');
  const [academicDegree, setAcademicDegree] = useState('B.Tech in Computer Science');
  const [hobbies, setHobbies] = useState('Carnatic Music, Cycling');
  const [experience, setExperience] = useState('Software Analyst, Civil Services aspirant');

  // Media states
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [stream, setStream] = useState(null);

  // Active Interview states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [aiText, setAiText] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [evaluating, setEvaluating] = useState(false);
  const [activeBoardMemberId, setActiveBoardMemberId] = useState('mathur');

  // Scorecard tabs: 'summary' | 'transcript' | 'skills' | 'plan'
  const [resultTab, setResultTab] = useState('summary');
  const [activeCritiqueId, setActiveCritiqueId] = useState(null);

  // References
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const currentIdxRef = useRef(0);
  const answersRef = useRef([]);

  // Sync references to avoid stale closure state
  useEffect(() => {
    currentIdxRef.current = currentIdx;
  }, [currentIdx]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Audio Canvas visualizer sync
  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraActive, stream, step]);

  // Pre-load WebSpeech voices
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Multi-Member Board Profiles
  const boardMembers = {
    mathur: {
      name: 'Dr. B. K. Mathur',
      role: 'Board Chairperson',
      specialty: 'DAF Background, State Profile & Personality',
      avatar: '👨‍💼',
      voiceConfig: { lang: 'en-IN', pitch: 1.0, rate: 0.92 } // Calm & hosting
    },
    swamy: {
      name: 'Prof. Aruna Swamy',
      role: 'Syllabus & Optional Expert',
      specialty: 'Optional Subject depth, Policy & GS papers',
      avatar: '👩‍🏫',
      voiceConfig: { lang: 'en-IN', pitch: 1.15, rate: 1.05 } // Fast & analytical
    },
    raghavan: {
      name: 'Shri Vijay Raghavan',
      role: 'Ethics & Crisis Commissioner',
      avatar: '👨‍⚖️',
      specialty: 'Aptitude, Ethics case studies, Crisis reaction (SRT)',
      voiceConfig: { lang: 'en-IN', pitch: 0.78, rate: 0.86 } // Grave & low pitch
    }
  };

  // 15 Categories of UPSC board questions mapped to active members
  const questions = [
    // Dr. Mathur - Chairperson (Personality/DAF)
    {
      memberId: 'mathur',
      focus: 'Profile & Background',
      text: `Hello ${candidateName}. Welcome to your UPSC mock interview board. Let us begin. Please tell the panel about yourself, your academic degree in ${academicDegree}, and your motivation for joining civil services.`
    },
    {
      memberId: 'mathur',
      focus: 'Home State Profile',
      text: `I see that you come from the state of ${stateName}. What do you believe are the top three administrative bottlenecks holding back economic growth in your home state, and how would you resolve them?`
    },
    {
      memberId: 'mathur',
      focus: 'Hobbies & Interests',
      text: `You have listed ${hobbies} as your hobbies. How can we leverage classical folk arts and sports like Carnatic music or cycling to improve tourism and health indicators at the grass-roots level?`
    },
    {
      memberId: 'mathur',
      focus: 'Work Experience',
      text: `Looking at your experience as ${experience}, how do you plan to use this professional skillset to modernize internal governance systems inside your district?`
    },
    {
      memberId: 'mathur',
      focus: 'Values & Resilience',
      text: `Civil service preparation requires massive mental resilience. Describe a failure in your academic or professional life and how you managed to recover from it using public service values.`
    },

    // Prof. Swamy - Optional & GS Syllabus
    {
      memberId: 'swamy',
      focus: 'Optional Subject Analysis',
      text: `Let us address your optional subject of ${optionalSubject}. Under global climate changes like El Niño Southern Oscillation, how do you analyze its direct impact on drylands agriculture and water supply in southern India?`
    },
    {
      memberId: 'swamy',
      focus: 'GS-2 - Indian Federalism',
      text: `In recent years, the debate over cooperative versus confrontational federalism has escalated. How do you evaluate the dispute-resolution effectiveness of the Inter-State Council and GST Council?`
    },
    {
      memberId: 'swamy',
      focus: 'GS-2 - Local Governance',
      text: `The 73rd and 74th Amendments aimed to devolve power. However, local bodies are criticized for lacking funds, functions, and functionaries. What structural amendments do you propose to empower local panchayats?`
    },
    {
      memberId: 'swamy',
      focus: 'GS-3 - Sustainable Agriculture',
      text: `India's groundwater depletion is alarming, particularly in agricultural states. How can we transition farmers away from water-intensive crops like paddy while securing food security?`
    },
    {
      memberId: 'swamy',
      focus: 'GS-3 - Technology in Governance',
      text: `How can artificial intelligence and machine learning be leveraged to audit developmental expenditures in welfare schemes, ensuring transparency without compromising citizen privacy?`
    },

    // Shri Raghavan - Ethics, Logic, SRT
    {
      memberId: 'raghavan',
      focus: 'Critical Logical Aptitude',
      text: `I have a logical aptitude question. If a social policy requires local biometric validation, and twenty percent of senior citizens fail fingerprint scans due to manual wear, resulting in pension denial, how will you audit this bypass logically?`
    },
    {
      memberId: 'raghavan',
      focus: 'Crisis Situation Reaction (SRT)',
      text: `Imagine you are appointed as the District Magistrate. A major highway project is approved, but local displacement leads to violent protests. A politician calls demanding you deploy immediate force to clear the site. What is your ethical course of action?`
    },
    {
      memberId: 'raghavan',
      focus: 'GS-4 - Administrative Integrity',
      text: `Imagine you discover a senior colleague in your department is leaking draft policy reports to private consultancies. You have no formal proof. How do you handle this dilemma without breaching administrative decorum?`
    },
    {
      memberId: 'raghavan',
      focus: 'Critical Analytical Thinking',
      text: `We face a direct trade-off between green conservation (protecting forest land) and developmental infrastructure (building hydel power projects in tribal areas). As a public administrator, how will you evaluate this balance?`
    },
    {
      memberId: 'swamy',
      focus: 'GS-3 - Semiconductor Policy',
      text: `Finally, with your background in ${academicDegree}, do you believe India's financial subsidy model under the ISM semiconductor program is structured logically to build local fab capacity or is it too dependent on foreign technology transfers?`
    }
  ];

  // 15 Conversational transition feedback responses
  const transitionFeedbacks = [
    `Thank you for sharing your background, ${candidateName}. Dr. Mathur is done. Let us discuss your home state.`,
    `Bottlenecks noted. Let us move to your hobbies of ${hobbies}.`,
    `A practical combination of health and culture. Let us review your work experience.`,
    `Modernizing administration is indeed a key priority. Let us check your values under failure.`,
    `Resilience is key in administrative services. Dr. Mathur is done. Let me hand over to Prof. Aruna Swamy for optional subject analysis.`,
    `A solid overview of optional themes. Prof. Swamy is satisfied. Let us discuss cooperative federalism.`,
    `GST council dynamics analyzed. Let us look at local governance devolution.`,
    `Empowering local panchayats is vital. Let us examine groundwater depletion.`,
    `Groundwater crop substitution models noted. Let us check technology in welfare auditing.`,
    `Technology integration parameters captured. Prof. Swamy is satisfied. Shri Vijay Raghavan will now ask you logical aptitude and ethics questions.`,
    `Logical audit bypass captured. Now, Shri Vijay Raghavan will present a critical Situation Reaction Test.`,
    `A dialogical crisis resolution method. Let us review administrative integrity case study.`,
    `Decorum and checking leaks are both required. Let us move to environmental displacement.`,
    `Environmental trade-offs analyzed. Let us address the final policy question on semiconductor Fab corridors.`,
    `Thank you, candidate. The board panel is satisfied with your critical reasoning. The chairperson is now closing the interview session.`
  ];

  const activeQuestion = questions[currentIdx] || questions[0];
  const activeMember = boardMembers[activeQuestion.memberId];

  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        // Fix double transcription: query cumulative results directly
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        
        setUserTranscript(fullTranscript);
        
        // Silence detection: proceed automatically on 2.2s of silence
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          autoSubmitResponse(fullTranscript);
        }, 2200);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e) => {
        console.warn('Recognition error:', e.error);
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      stopMedia();
      window.speechSynthesis.cancel();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [optionalSubject, step]);

  // Voice synthesis modulated with member voices
  const speakWithMemberVoice = (text, memberId, callback) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const member = boardMembers[memberId] || boardMembers.mathur;
    
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === 'en-IN') ||
                  voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('india')) ||
                  voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google')) ||
                  voices.find(v => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    
    utterance.pitch = member.voiceConfig.pitch;
    utterance.rate = member.voiceConfig.rate;

    utterance.onstart = () => {
      setIsAiSpeaking(true);
      setActiveBoardMemberId(memberId);
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
    } catch (err) {
      console.warn('Camera failed:', err);
      setCameraActive(false);
    }
  };

  const stopMedia = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setStream(null);
    setCameraActive(false);
    setMicActive(false);
  };

  // Launch mock board session
  const handleStartInterview = async () => {
    setStep('interview');
    setCurrentIdx(0);
    setAnswers([]);
    setUserTranscript('');
    await startCamera();

    setTimeout(() => {
      triggerAiQuestion(0);
    }, 800);
  };

  const triggerAiQuestion = (idx) => {
    const q = questions[idx];
    setAiText(q.text);
    speakWithMemberVoice(q.text, q.memberId, () => {
      startMicListening();
    });
  };

  const startMicListening = () => {
    if (recognitionRef.current) {
      setUserTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {}
    }
  };

  const stopListeningAndSubmit = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Process response and trigger transition voice feedbacks
  const autoSubmitResponse = (textToSubmit) => {
    stopListeningAndSubmit();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    const finalAnswer = textToSubmit.trim();
    if (!finalAnswer) return;

    setUserTranscript('');

    setAnswers((prevAnswers) => {
      const nextAnswers = [...prevAnswers, finalAnswer];
      const activeIdx = currentIdxRef.current;

      // Speak transitional feedback using active board member
      const feedbackText = transitionFeedbacks[activeIdx];
      setAiText(feedbackText);

      // Chairperson Mathur does transitions, except Raghavan handles water/SRT/logic
      let transitionSpeakerId = 'mathur';
      if (activeIdx >= 10 && activeIdx <= 13) {
        transitionSpeakerId = 'raghavan';
      }

      speakWithMemberVoice(feedbackText, transitionSpeakerId, () => {
        if (activeIdx < questions.length - 1) {
          const nextIdx = activeIdx + 1;
          setCurrentIdx(nextIdx);
          triggerAiQuestion(nextIdx);
        } else {
          // Finish session, load Mercor scorecard
          setEvaluating(true);
          stopMedia();
          setTimeout(() => {
            setEvaluating(false);
            setStep('result');
            setResultTab('summary');
          }, 2400);
        }
      });

      return nextAnswers;
    });
  };

  const handleNextStep = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    autoSubmitResponse(userTranscript);
  };

  const handleSelectSample = () => {
    setCandidateName('Dr. Avinash Deshmukh');
    setStateName('Maharashtra');
    setOptionalSubject('Sociology');
    setAcademicDegree('MBBS from AFMC Pune');
    setHobbies('Wildlife Photography, Marathon running');
    setExperience('Medical Officer, Rural Health volunteer');
  };

  // Mercor-Style Transcript marked locations
  const transcriptHighlights = [
    {
      q: `Q1: Introduction & Candidate Profile`,
      ans: `My name is Rithika. I graduated in computer science engineering from Telangana. I am extremely motivated to join the civil services because it offers a direct developmental platform to implement technology pipelines inside municipal governance and public schools.`,
      highlights: [
        { startIdx: 125, endIdx: 220, type: 'good', text: 'direct developmental platform to implement technology pipelines inside municipal governance', feedback: 'Dr. Mathur: "Excellent focus. Connecting computer science degree parameters directly to municipal service delivery pipelines is highly practical."' }
      ]
    },
    {
      q: `Q6: Geography Optional Inquiry`,
      ans: `In geography, El Niño triggers high sea-surface temperatures in the Pacific, weakening the monsoonal winds. This causes dry spells over central and southern India, meaning crop failure. We need to implement localized water conservation like farm ponds to mitigate this.`,
      highlights: [
        { startIdx: 35, endIdx: 82, type: 'good', text: 'high sea-surface temperatures in the Pacific, weakening the monsoonal winds', feedback: 'Prof. Swamy: "Strong conceptual accuracy. Candidate correctly maps El Niño physical anomalies to Indian monsoonal wind patterns."' },
        { startIdx: 140, endIdx: 215, type: 'warn', text: 'farm ponds to mitigate this', feedback: 'Prof. Swamy: "Somewhat generic water recommendation. Citing specific schemes like PM Krishi Sinchayee Yojana or watershed clusters would score higher."' }
      ]
    },
    {
      q: `Q11: logical Aptitude Pension Case`,
      ans: `To audit this logically, I will propose a dual authentication bypass. If iris scans fail, we will verify using local Aadhar OTP or physical verified registry certified by local block development officers to prevent denial of service.`,
      highlights: [
        { startIdx: 85, endIdx: 185, type: 'good', text: 'local Aadhar OTP or physical verified registry certified by local block development officers', feedback: 'Shri Raghavan: "Excellent administrative logic. Balances security checks with localized social audits to prevent service denial."' }
      ]
    },
    {
      q: `Q12: Situation Reaction Test (SRT)`,
      ans: `If a politician pressures me to use force on protesters, I will politely decline. I will establish a direct dialogue channel with protest leaders to verify their grievances. Force will only be deployed as a last resort under IPC if public property is physically threatened.`,
      highlights: [
        { startIdx: 50, endIdx: 125, type: 'good', text: 'establish a direct dialogue channel with protest leaders to verify their grievances', feedback: 'Shri Raghavan: "High crisis leadership score. Prioritizes constitutional dialogue over coercive pressure, adhering to standard civil services ethics."' }
      ]
    }
  ];

  const soundWaveBars = Array.from({ length: 8 });

  return (
    <div style={{ padding: '30px 40px', maxWidth: 1100, margin: '0 auto' }}>
      
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>AI Board Interview Simulator 🎙️</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Mercor-inspired multi-specialist board mock session</p>
        </div>
      </div>

      {/* STEP 1: DAF SETUP FORM */}
      {step === 'setup' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 30 }}>
          {/* Left panel: Form */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '30px', display: 'flex', flexDirection: 'column', gap: 18
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 10 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>UPSC Profile & DAF Configurator</h2>
              <button 
                onClick={handleSelectSample}
                style={{
                  background: 'var(--purple-dim)', border: '1px solid rgba(124,111,255,0.2)',
                  borderRadius: 8, padding: '5px 12px', fontSize: 11, color: 'var(--purple)', fontWeight: 600
                }}
              >
                ⚡ Use Sample Profile
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Candidate Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 12, outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Home State</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 12, outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Optional Subject</label>
                <select
                  value={optionalSubject}
                  onChange={(e) => setOptionalSubject(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 12, outline: 'none'
                  }}
                >
                  <option value="Geography">Geography</option>
                  <option value="Political Science (PSIR)">Political Science (PSIR)</option>
                  <option value="Sociology">Sociology</option>
                  <option value="Public Administration">Public Administration</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Educational Degree</label>
                <input
                  type="text"
                  value={academicDegree}
                  onChange={(e) => setAcademicDegree(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 12, outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Hobbies & Extracurriculars</label>
              <input
                type="text"
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 12, outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Work Draft / Resume Notes</label>
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Include work experience or core topics you want the board to investigate..."
                style={{
                  width: '100%', height: 60, padding: '10px', borderRadius: 8,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 12, outline: 'none', resize: 'none'
                }}
              />
            </div>

            <button
              onClick={handleStartInterview}
              style={{
                background: 'var(--purple)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700,
                boxShadow: '0 4px 14px rgba(124,111,255,0.3)', marginTop: 8
              }}
            >
              Start Multi-Member Board Mock Session
            </button>
          </div>

          {/* Right panel: Board Details */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '30px', display: 'flex', flexDirection: 'column', gap: 20
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Active UPSC Mock Board Members</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.values(boardMembers).map((m) => (
                <div style={{
                  display: 'flex', gap: 14, background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 12, padding: '12px'
                }}>
                  <span style={{ fontSize: 24 }}>{m.avatar}</span>
                  <div>
                    <strong style={{ fontSize: 12, color: 'var(--text)', display: 'block' }}>{m.name}</strong>
                    <span style={{ fontSize: 9, color: 'var(--purple)', fontWeight: 650, textTransform: 'uppercase', display: 'block', marginTop: 1 }}>{m.role}</span>
                    <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4, lineHeight: 1.4 }}>{m.specialty}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: ACTIVE BOARD SESSION */}
      {step === 'interview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Active Board Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {Object.entries(boardMembers).map(([id, m]) => {
              const isActive = activeBoardMemberId === id;
              return (
                <div key={id} style={{
                  background: isActive ? 'var(--surface2)' : 'var(--surface)',
                  border: isActive ? '1px solid var(--purple)' : '1px solid var(--border)',
                  boxShadow: isActive ? '0 0 15px rgba(124,111,255,0.15)' : 'none',
                  borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center',
                  transition: 'all 0.3s'
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isActive ? 'var(--purple)' : 'var(--surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                  }}>{m.avatar}</div>
                  <div>
                    <strong style={{ fontSize: 12, color: isActive ? 'var(--text)' : 'var(--text2)', display: 'block' }}>{m.name}</strong>
                    <span style={{ fontSize: 8, color: isActive ? 'var(--purple)' : 'var(--text3)', fontWeight: 700, textTransform: 'uppercase' }}>{m.role}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Split Screen Webcam & Speaking Board */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            
            {/* Webcam feed */}
            <div style={{
              background: '#07080c', border: '1px solid var(--border)',
              borderRadius: 16, overflow: 'hidden', aspectRatio: '1.5',
              display: 'flex', flexDirection: 'column', justifycontent: 'flex-end',
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
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 12, textAlign: 'center', background: 'var(--surface2)'
                }}>
                  <span style={{ fontSize: 24 }}>📷</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Camera Inactive</span>
                </div>
              )}

              {/* Bottom overlay info bar */}
              <div style={{
                padding: '8px 12px', background: 'rgba(9,9,11,0.75)',
                backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cameraActive ? 'var(--green)' : 'var(--text3)' }} />
                  Aspirant: {candidateName}
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

            {/* Speaking Board Member Details */}
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 16, overflow: 'hidden', aspectRatio: '1.5',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              padding: '24px', position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Active Speaker: {activeMember.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase' }}>{activeMember.role}</div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 12, background: 'var(--purple-dim)', color: 'var(--purple)'
                }}>Question {currentIdx + 1} of 15</span>
              </div>

              {/* Text display */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
                <p style={{ fontSize: 12, color: 'var(--text)', textAlign: 'center', lineHeight: 1.6, fontStyle: 'italic', maxWidth: 390 }}>
                  "{aiText || 'Starting UPSC Panel chairperson questions...'}"
                </p>
              </div>

              {/* Speech waves */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <span style={{ fontSize: 9, color: 'var(--purple)', fontWeight: 700, textTransform: 'uppercase' }}>Focus: {activeQuestion.focus}</span>
                
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

          {/* User Transcript and Mic Capture */}
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 18, color: isListening ? 'var(--red)' : 'var(--text3)'
              }}>🎙️</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: isListening ? 'var(--text)' : 'var(--text3)' }}>
                {isListening ? 'Speech Recognition Active... Speak now (Will auto-submit on 2.2s silence)' : 'Ready to record. Click "Speak Answer" to start.'}
              </span>
            </div>

            <textarea
              value={userTranscript}
              onChange={(e) => setUserTranscript(e.target.value)}
              placeholder="Your voice responses will transcribe here in real time. You can edit it manually before submitting..."
              style={{
                width: '100%', height: 80, padding: '10px 12px', borderRadius: 8,
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
                  padding: '8px 18px', fontSize: 12, fontWeight: 600,
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
                  padding: '8px 24px', fontSize: 12, fontWeight: 700, color: '#fff',
                  opacity: userTranscript.trim() ? 1 : 0.4, cursor: 'pointer'
                }}
              >
                {currentIdx < questions.length - 1 ? 'Next Question →' : 'Finish & Compile Scorecard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: MERCOR-STYLE EVALUATION CARD */}
      {step === 'result' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Executive Overview Header */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '24px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Mercor Evaluation Verdict</span>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                Highly Recommended <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 8px', borderRadius: 4, marginLeft: 10 }}>Verdict: Pass (268/300)</span>
              </h2>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => {
                  setStep('setup');
                  setCurrentIdx(0);
                  setAnswers([]);
                }}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 16px', fontSize: 12, color: 'var(--text)', fontWeight: 600
                }}
              >
                🔄 Re-take Mock
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                style={{
                  background: 'var(--purple)', border: 'none',
                  borderRadius: 8, padding: '8px 20px', fontSize: 12, color: '#fff', fontWeight: 700
                }}
              >
                Dashboard
              </button>
            </div>
          </div>

          {/* Mercor Tabs Selector */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 8 }}>
            {[
              { id: 'summary', label: '📊 Summary Metrics' },
              { id: 'transcript', label: '📝 Transcript Timeline' },
              { id: 'skills', label: '🏆 Detailed Skill Matrix' },
              { id: 'plan', label: '📚 ARC-II Syllabus Plan' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setResultTab(t.id);
                  setActiveCritiqueId(null);
                }}
                style={{
                  padding: '12px 20px', border: 'none', background: 'transparent',
                  color: resultTab === t.id ? 'var(--purple)' : 'var(--text2)',
                  borderBottom: resultTab === t.id ? '2px solid var(--purple)' : '2px solid transparent',
                  fontSize: 12, fontWeight: resultTab === t.id ? 700 : 500, transition: 'all 0.2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content area */}
          <div style={{ minHeight: 300 }}>
            
            {/* TAB 1: SUMMARY METRICS */}
            {resultTab === 'summary' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Structure & Coherence</div>
                  <strong style={{ fontSize: 26, color: 'var(--text)', fontFamily: 'monospace' }}>8.5<span style={{ fontSize: 11, color: 'var(--text3)' }}>/10</span></strong>
                  <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 8, lineHeight: 1.4 }}>Balanced standard introductions. Logical paragraph segregation was noted across answers.</p>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Syllabus Alignment</div>
                  <strong style={{ fontSize: 26, color: 'var(--purple)', fontFamily: 'monospace' }}>7.8<span style={{ fontSize: 11, color: 'var(--text3)' }}>/10</span></strong>
                  <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 8, lineHeight: 1.4 }}>Optional subject terms were solid. Citing specific developmental schemes will increase weight.</p>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Speech Pacing / Tone</div>
                  <strong style={{ fontSize: 26, color: 'var(--teal)', fontFamily: 'monospace' }}>9.0<span style={{ fontSize: 11, color: 'var(--text3)' }}>/10</span></strong>
                  <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 8, lineHeight: 1.4 }}>Indian English voice pacing was stable, maintaining a steady conversational cadence.</p>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Ethics Reasoning (GS-4)</div>
                  <strong style={{ fontSize: 26, color: 'var(--amber)', fontFamily: 'monospace' }}>8.8<span style={{ fontSize: 11, color: 'var(--text3)' }}>/10</span></strong>
                  <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 8, lineHeight: 1.4 }}>Balanced situation reaction answers, adhering strictly to constitutional values under pressure.</p>
                </div>

              </div>
            )}

            {/* TAB 2: TRANSCRIPT TIMELINE ANALYSIS (Mercor Highlight Feature) */}
            {resultTab === 'transcript' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
                {/* Left side: Highlighted Transcripts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {transcriptHighlights.map((t, idx) => (
                    <div key={idx} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 14, padding: '16px'
                    }}>
                      <strong style={{ fontSize: 11, color: 'var(--purple)', display: 'block', marginBottom: 8 }}>{t.q}</strong>
                      <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7 }}>
                        {/* Map highlights */}
                        {(() => {
                          let lastIdx = 0;
                          const elements = [];
                          t.highlights.forEach((h, hIdx) => {
                            const before = t.ans.slice(lastIdx, h.startIdx);
                            const matched = t.ans.slice(h.startIdx, h.endIdx);
                            elements.push(before);
                            elements.push(
                              <span
                                key={hIdx}
                                onClick={() => setActiveCritiqueId(`${idx}-${hIdx}`)}
                                style={{
                                  background: h.type === 'good' ? 'var(--teal-dim)' : 'var(--amber-dim)',
                                  color: h.type === 'good' ? 'var(--teal)' : 'var(--amber)',
                                  borderBottom: h.type === 'good' ? '1px dashed var(--teal)' : '1px dashed var(--amber)',
                                  padding: '1px 3px', borderRadius: 4, cursor: 'pointer', fontWeight: 555
                                }}
                              >
                                {matched}
                              </span>
                            );
                            lastIdx = h.endIdx;
                          });
                          elements.push(t.ans.slice(lastIdx));
                          return elements;
                        })()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Right side: Clickable active critique details */}
                <div style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '20px', position: 'sticky', top: 80, height: 'fit-content'
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Mercor Interactive Critique</span>
                  {activeCritiqueId ? (
                    (() => {
                      const [tIdx, hIdx] = activeCritiqueId.split('-').map(Number);
                      const target = transcriptHighlights[tIdx].highlights[hIdx];
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{
                            fontSize: 11, padding: '8px 12px', background: 'var(--surface)',
                            borderLeft: target.type === 'good' ? '3px solid var(--teal)' : '3px solid var(--amber)',
                            color: 'var(--text2)', borderRadius: '0 6px 6px 0', fontStyle: 'italic'
                          }}>
                            "{target.text}"
                          </div>
                          <div>
                            <strong style={{ fontSize: 12, color: 'var(--text)', display: 'block' }}>Panel Annotation</strong>
                            <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6, lineHeight: 1.5 }}>{target.feedback}</p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
                      <span style={{ fontSize: 24, display: 'block', marginBottom: 10 }}>👆</span>
                      <p style={{ fontSize: 11 }}>Click any highlighted phrase in the transcripts to view detailed board panel annotations and corrections.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SKILL MATRIX */}
            {resultTab === 'skills' && (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16
              }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 4 }}>Granular Skills Evaluation Map</h4>
                {[
                  { name: 'Syllabus Keyword Precision', score: 78, desc: 'Use of specific standard terms (e.g. Finance Commission, JP Narayan doctrines, PM-KMY).' },
                  { name: 'Communication Delivery & Pacing', score: 92, desc: 'Maintaining steady 110-135 words-per-minute voice cadence. Smooth transitions.' },
                  { name: 'GS-4 Ethics Coherence', score: 86, desc: 'Logical balance of rules and empathy. Prioritizing constitutional dialogue over physical force.' },
                  { name: 'Critical Problem Solving & Aptitude', score: 80, desc: 'Logical segregation of pension audit queries and dual authentication bypass suggestions.' },
                  { name: 'Stress Handling under Cross-Examination', score: 85, desc: 'Stable voice pitch/modulations when questioned with administrative gravity.' }
                ].map(s => (
                  <div key={s.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <strong style={{ color: 'var(--text)' }}>{s.name}</strong>
                      <span style={{ fontWeight: 700, color: 'var(--purple)' }}>{s.score}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--purple)', width: `${s.score}%`, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{s.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: ARC-II DEVELOP PLAN */}
            {resultTab === 'plan' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12
                }}>
                  <strong style={{ fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>📖 Recommended Reading Lists</strong>
                  <ul style={{ paddingLeft: 20, fontSize: 12, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <li><strong>2nd Administrative Reforms Commission (ARC-II)</strong>: Chapter 4 on "Ethics in Governance" for situation reaction scenarios.</li>
                    <li><strong>Economic Survey Chapter 6</strong>: Study local rural investment figures and PM-PMKSY farm ponds telemetry metrics.</li>
                    <li><strong>15th Finance Commission guidelines</strong>: Review local bodies fund allocation formulas.</li>
                  </ul>
                </div>

                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12
                }}>
                  <strong style={{ fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>📋 Active Improvement Plan</strong>
                  <ul style={{ paddingLeft: 20, fontSize: 12, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <li><strong>Minimize generic advice</strong>: When asking policy questions, immediately back arguments by naming the specific regulatory body or ministry scheme.</li>
                    <li><strong>Voice pacing balance</strong>: Practice speaking at exactly 120 WPM. Focus on sentence-end breath pauses.</li>
                    <li><strong>Structured debate logs</strong>: Follow a 3-part layout: Acknowledge crisis, cite constitutional articles, suggest digital social audits.</li>
                  </ul>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
