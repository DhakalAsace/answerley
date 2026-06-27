"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ContactRound,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  Route,
  Save,
  Send,
  ShieldAlert,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  applySetupChange,
  calculateAnsweringSetupReadiness,
  demoAnsweringSetup,
  generateSetupTestPrompts,
  type AnsweringSetup,
  type SetupChangeProposal,
  type SetupPatchOperation,
  type SuggestedSetupTestPrompt,
} from "@/domain/small-business-answering";
import type { SetupAssistantResult } from "@/integrations/gemini/setup-assistant";
import { cn, formatLabel } from "@/lib/utils";
import { saveSbaWorkspace, type StoredTestCall } from "@/lib/sba-client-storage";

type Phase = "building" | "testing" | "review" | "save";
type TranscriptTurn = { id: string; speaker: "caller" | "setup"; text: string };
type ImportState = "idle" | "reading" | "ready" | "fallback";

type LiveState = "idle" | "starting" | "connected" | "ready" | "closed" | "error";
type LiveSessionPayload = {
  provider: "gemini-live";
  webSocketUrl: string;
  setupMessage: Record<string, unknown>;
  runtime: {
    planId: string;
    planRevision: number;
    identity: string;
    toolCount: number;
  };
  expiresAt: string;
  newSessionExpiresAt: string;
};

type GeminiLiveMessage = {
  setupComplete?: unknown;
  serverContent?: {
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    interrupted?: boolean;
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    generationComplete?: boolean;
    turnComplete?: boolean;
  };
  toolCall?: { functionCalls?: Array<{ id?: string; name?: string; args?: unknown }> };
};

type MicState = "idle" | "requesting" | "active" | "muted" | "blocked" | "error";
type LiveAudioCapture = {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  stream: MediaStream;
  pending: Float32Array;
  lastLevelUpdate: number;
};

const LIVE_INPUT_SAMPLE_RATE = 16000;
const LIVE_OUTPUT_SAMPLE_RATE = 24000;
const LIVE_AUDIO_CHUNK_SIZE = 1600;
const LIVE_AUDIO_PROCESSOR_SIZE = 4096;

function createAudioContext() {
  const AudioContextClass =
    window.AudioContext ??
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error("Browser audio is not available.");
  return new AudioContextClass();
}

function concatFloat32(left: Float32Array, right: Float32Array) {
  if (!left.length) return right;
  const output = new Float32Array(left.length + right.length);
  output.set(left);
  output.set(right, left.length);
  return output;
}

function downsampleAudio(input: Float32Array, inputRate: number, outputRate: number) {
  if (inputRate === outputRate) return new Float32Array(input);
  if (inputRate < outputRate) return new Float32Array(input);

  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), input.length);
    let sum = 0;
    let count = 0;
    for (let cursor = start; cursor < end; cursor += 1) {
      sum += input[cursor] ?? 0;
      count += 1;
    }
    output[index] = count ? sum / count : input[start] ?? 0;
  }
  return output;
}

function float32ToPcm16Base64(samples: Float32Array) {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function pcm16Base64ToFloat32(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(index * 2, true) / 0x8000;
  }
  return samples;
}

function sampleRateFromMimeType(mimeType?: string) {
  const match = mimeType?.match(/rate=(\d+)/i);
  return match ? Number(match[1]) : LIVE_OUTPUT_SAMPLE_RATE;
}

function calculateRms(samples: Float32Array) {
  if (!samples.length) return 0;
  let sum = 0;
  samples.forEach((sample) => {
    sum += sample * sample;
  });
  return Math.min(1, Math.sqrt(sum / samples.length) * 5);
}

let localIdCounter = 0;
function nextLocalId(prefix: string) {
  localIdCounter += 1;
  return `${prefix}_${localIdCounter}`;
}

type OutcomeCard = {
  id: string;
  type: "details" | "request" | "message" | "followup" | "alert" | "transfer" | "urgent";
  title: string;
  detail: string;
  status: string;
};

const buildSteps = [
  "Reading website information",
  "Finding services and approved answers",
  "Checking hours and after-hours wording",
  "Finding booking and contact links",
  "Preparing call handling and safety",
  "Preparing the call test",
];

function deriveBusinessName(input: string) {
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    const base = url.hostname.replace(/^www\./, "").split(".")[0];
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Your Business";
  } catch {
    return input.trim() || "Your Business";
  }
}

function normalizeWebsiteInput(input: string) {
  if (!input.includes(".")) return null;
  return input.startsWith("http") ? input : `https://${input}`;
}

function createSetup(input: string): AnsweringSetup {
  const setup = structuredClone(demoAnsweringSetup);
  const businessName = deriveBusinessName(input);
  setup.setupId = `setup_${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "demo"}`;
  setup.businessId = `business_${setup.setupId.replace(/^setup_/, "")}`;
  setup.status.draftRevision = 1;
  setup.status.liveRevision = 0;
  setup.status.isLive = false;
  setup.status.needsReview = true;
  setup.business.name = businessName;
  setup.business.websiteUrl = normalizeWebsiteInput(input);
  setup.callHandling.callerGreeting = `Thanks for calling ${businessName}. How can I help today?`;
  setup.sources = setup.business.websiteUrl
    ? [{
        id: "source_submitted_website",
        type: "website",
        label: "Submitted website",
        url: setup.business.websiteUrl,
        excerpt: null,
        capturedAt: new Date().toISOString(),
      }]
    : [];
  return setup;
}

export function SmallBusinessAnsweringTryClient({
  businessInput = "example.com",
  preview = null,
}: {
  businessInput?: string;
  preview?: string | null;
}) {
  const router = useRouter();
  const previewPhase: Phase =
    preview === "testing" || preview === "testing-populated"
      ? "testing"
      : preview === "review"
        ? "review"
        : preview === "save"
          ? "save"
          : "building";
  const previewPopulated = preview === "testing-populated";
  const buildFinishedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>(previewPhase);
  const [buildStep, setBuildStep] = useState(preview === "building-complete" ? buildSteps.length - 1 : 0);
  const [setup, setSetup] = useState<AnsweringSetup>(() => createSetup(businessInput));
  const [importState, setImportState] = useState<ImportState>("idle");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [callEnded, setCallEnded] = useState(previewPopulated);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>(() =>
    previewPopulated
      ? [
          { id: "preview_turn_1", speaker: "setup", text: "Thanks for calling Example. How can I help today?" },
          { id: "preview_turn_2", speaker: "caller", text: "I would like to request an appointment for Thursday afternoon." },
          { id: "preview_turn_3", speaker: "setup", text: "Absolutely. I have your request and contact details ready for the team." },
        ]
      : [],
  );
  const [outcomes, setOutcomes] = useState<OutcomeCard[]>(() =>
    previewPopulated
      ? [
          { id: "preview_outcome_1", type: "details", title: "Contact details collected", detail: "Jamie - 204-555-0184", status: "Captured" },
          { id: "preview_outcome_2", type: "request", title: "Request captured", detail: "Appointment request - Thursday afternoon", status: "Test request" },
          { id: "preview_outcome_3", type: "alert", title: "Owner alert prepared", detail: "New appointment request from Jamie", status: "Ready after activation" },
        ]
      : [],
  );
  const [unknownQuestion, setUnknownQuestion] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [alertPhone, setAlertPhone] = useState("");
  const [email, setEmail] = useState("");
  const liveSocketRef = useRef<WebSocket | null>(null);
  const liveCaptureRef = useRef<LiveAudioCapture | null>(null);
  const liveInputTurnIdRef = useRef<string | null>(null);
  const liveResponseTurnIdRef = useRef<string | null>(null);
  const liveOutputAudioContextRef = useRef<AudioContext | null>(null);
  const liveOutputSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const liveOutputPlaybackTimeRef = useRef(0);
  const callActiveRef = useRef(false);
  const mutedRef = useRef(false);
  const [liveState, setLiveState] = useState<LiveState>("idle");
  const [liveMessage, setLiveMessage] = useState("Voice test will connect when the call starts.");
  const [liveRuntimeIdentity, setLiveRuntimeIdentity] = useState<string | null>(null);
  const [liveAudioChunks, setLiveAudioChunks] = useState(0);
  const [micState, setMicState] = useState<MicState>("idle");
  const [micLevel, setMicLevel] = useState(0);

  const finishBuild = useCallback(async () => {
    const websiteUrl = normalizeWebsiteInput(businessInput);
    if (!websiteUrl) {
      setImportState("fallback");
      setImportMessage("No website was supplied, so this setup starts from the safe demo defaults.");
      setPhase("testing");
      return;
    }
    setImportState("reading");
    try {
      const response = await fetch("/api/dev/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl, buildSetup: true, buildLegacyPlan: false }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Website import failed.");
      if (body.setup) {
        setSetup(body.setup as AnsweringSetup);
        setImportState("ready");
        setImportMessage(`Built from ${body.scrape?.documents?.length ?? 0} website page${body.scrape?.documents?.length === 1 ? "" : "s"}.`);
      }
    } catch (error) {
      setImportState("fallback");
      setImportMessage(error instanceof Error ? error.message : "Website import failed, so safe defaults are being used.");
    } finally {
      setPhase("testing");
    }
  }, [businessInput]);

  useEffect(() => {
    if (phase !== "building") return;
    const interval = window.setInterval(() => {
      setBuildStep((current) => {
        if (current >= buildSteps.length - 1) {
          window.clearInterval(interval);
          if (!buildFinishedRef.current) {
            buildFinishedRef.current = true;
            window.setTimeout(() => void finishBuild(), 450);
          }
          return current;
        }
        return current + 1;
      });
    }, 540);
    return () => window.clearInterval(interval);
  }, [finishBuild, phase]);

  useEffect(() => {
    mutedRef.current = muted;
    if (liveCaptureRef.current && callActive) {
      setMicState(muted ? "muted" : "active");
    }
  }, [callActive, muted]);

  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);

  const suggestions = useMemo(() => generateSetupTestPrompts(setup), [setup]);
  const readiness = useMemo(() => calculateAnsweringSetupReadiness(setup), [setup]);
  const businessName = setup.business.name || "Your Business";

  async function startCall() {
    if (callActiveRef.current) return;
    setCallActive(true);
    setCallEnded(false);
    setUnknownQuestion(null);
    stopQueuedLiveAudio();
    setTranscript([
      {
        id: nextLocalId("turn"),
        speaker: "setup",
        text: setup.callHandling.callerGreeting || `Thanks for calling ${businessName}. How can I help today?`,
      },
    ]);
    setLiveMessage("Requesting microphone access.");
    await startMicrophoneStream();
    void connectGeminiLive();
  }

  function endCall() {
    setCallActive(false);
    setCallEnded(true);
    stopMicrophoneStream();
    stopQueuedLiveAudio();
    if (liveSocketRef.current) {
      liveSocketRef.current.close();
      liveSocketRef.current = null;
    }
    setLiveState((current) => current === "error" ? current : "closed");
    setLiveMessage("Test call voice session closed.");
  }

  async function connectGeminiLive() {
    if (liveSocketRef.current && liveSocketRef.current.readyState === WebSocket.OPEN) return;
    setLiveState("starting");
    setLiveMessage("Starting the voice test for this call.");
    setLiveAudioChunks(0);
    try {
      const response = await fetch("/api/dev/live-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setup, mode: "test" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Voice test failed.");
      const payload = body as LiveSessionPayload;
      setLiveRuntimeIdentity(payload.runtime.identity);
      const socket = new WebSocket(payload.webSocketUrl);
      liveSocketRef.current = socket;

      socket.onopen = () => {
        setLiveState("connected");
        setLiveMessage("Connected to the voice test. Speak naturally into your browser.");
        socket.send(JSON.stringify(payload.setupMessage));
      };
      socket.onmessage = async (event) => {
        const rawMessage =
          typeof event.data === "string"
            ? event.data
            : event.data instanceof Blob
              ? await event.data.text()
              : new TextDecoder().decode(event.data as ArrayBuffer);
        const message = JSON.parse(rawMessage) as GeminiLiveMessage;
        if (message.setupComplete !== undefined) {
          setLiveState("ready");
          setLiveMessage("Voice test is live. The setup can hear you and answer out loud.");
        }
        if (message.serverContent?.interrupted) {
          stopQueuedLiveAudio();
        }
        const input = message.serverContent?.inputTranscription?.text;
        if (input?.trim()) {
          appendLiveCallerTurn(input);
        }
        const output = message.serverContent?.outputTranscription?.text;
        if (output?.trim()) {
          appendLiveSetupTurn(output);
        }
        if (message.serverContent?.generationComplete || message.serverContent?.turnComplete) {
          liveResponseTurnIdRef.current = null;
        }
        if (message.serverContent?.turnComplete) {
          liveInputTurnIdRef.current = null;
        }
        const parts = message.serverContent?.modelTurn?.parts ?? [];
        const audioChunks = parts.filter((part) => Boolean(part.inlineData?.data)).length;
        if (audioChunks) {
          setLiveAudioChunks((current) => current + audioChunks);
        }
        parts.forEach((part) => {
          if (part.inlineData?.data) {
            playLiveAudio(part.inlineData.data, part.inlineData.mimeType);
          }
        });
        if (message.toolCall?.functionCalls?.length) {
          handleLiveToolCall(socket, message.toolCall.functionCalls);
        }
      };
      socket.onerror = () => {
        setLiveState("error");
        setLiveMessage("The voice test reported an error. You can still use typed prompts.");
      };
      socket.onclose = () => {
        if (liveSocketRef.current === socket) liveSocketRef.current = null;
        setLiveState((current) => current === "error" ? current : "closed");
      };
    } catch (error) {
      setLiveState("error");
      setLiveMessage(error instanceof Error ? error.message : "Voice test failed.");
    }
  }

  async function startMicrophoneStream() {
    stopMicrophoneStream();
    setMicLevel(0);

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState("error");
      setLiveMessage("This browser cannot use the microphone for the voice test.");
      return false;
    }

    setMicState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const context = createAudioContext();
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(LIVE_AUDIO_PROCESSOR_SIZE, 1, 1);
      const capture: LiveAudioCapture = {
        context,
        source,
        processor,
        stream,
        pending: new Float32Array(),
        lastLevelUpdate: 0,
      };

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const now = Date.now();
        if (now - capture.lastLevelUpdate > 120) {
          capture.lastLevelUpdate = now;
          setMicLevel(calculateRms(input));
        }

        const socket = liveSocketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN || !callActiveRef.current || mutedRef.current) return;

        const downsampled = downsampleAudio(input, context.sampleRate, LIVE_INPUT_SAMPLE_RATE);
        capture.pending = concatFloat32(capture.pending, downsampled);

        while (capture.pending.length >= LIVE_AUDIO_CHUNK_SIZE) {
          const chunk = capture.pending.slice(0, LIVE_AUDIO_CHUNK_SIZE);
          capture.pending = capture.pending.slice(LIVE_AUDIO_CHUNK_SIZE);
          socket.send(JSON.stringify({
            realtimeInput: {
              audio: {
                data: float32ToPcm16Base64(chunk),
                mimeType: `audio/pcm;rate=${LIVE_INPUT_SAMPLE_RATE}`,
              },
            },
          }));
        }
      };

      source.connect(processor);
      processor.connect(context.destination);
      liveCaptureRef.current = capture;
      setMicState(muted ? "muted" : "active");
      setLiveMessage("Microphone is ready. Connecting the answering voice.");
      return true;
    } catch (error) {
      setMicState(error instanceof DOMException && error.name === "NotAllowedError" ? "blocked" : "error");
      setLiveMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone permission was blocked. Typed prompts still work."
          : "Microphone setup failed. Typed prompts still work.",
      );
      return false;
    }
  }

  function stopMicrophoneStream() {
    const capture = liveCaptureRef.current;
    if (!capture) {
      setMicLevel(0);
      if (!callActiveRef.current) setMicState("idle");
      return;
    }
    capture.processor.disconnect();
    capture.source.disconnect();
    capture.stream.getTracks().forEach((track) => track.stop());
    void capture.context.close();
    liveCaptureRef.current = null;
    setMicLevel(0);
    setMicState("idle");
  }

  function getLiveOutputContext() {
    if (!liveOutputAudioContextRef.current || liveOutputAudioContextRef.current.state === "closed") {
      liveOutputAudioContextRef.current = createAudioContext();
      liveOutputPlaybackTimeRef.current = liveOutputAudioContextRef.current.currentTime;
    }
    return liveOutputAudioContextRef.current;
  }

  function playLiveAudio(base64: string, mimeType?: string) {
    try {
      const context = getLiveOutputContext();
      void context.resume();
      const samples = pcm16Base64ToFloat32(base64);
      if (!samples.length) return;
      const sampleRate = sampleRateFromMimeType(mimeType);
      const buffer = context.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => {
        liveOutputSourcesRef.current = liveOutputSourcesRef.current.filter((item) => item !== source);
      };
      liveOutputSourcesRef.current.push(source);
      const startAt = Math.max(context.currentTime + 0.02, liveOutputPlaybackTimeRef.current);
      source.start(startAt);
      liveOutputPlaybackTimeRef.current = startAt + buffer.duration;
    } catch {
      setLiveMessage("Voice response audio could not play, but the transcript is still available.");
    }
  }

  function stopQueuedLiveAudio() {
    liveOutputSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    });
    liveOutputSourcesRef.current = [];
    const context = liveOutputAudioContextRef.current;
    liveOutputPlaybackTimeRef.current = context ? context.currentTime : 0;
  }

  useEffect(() => () => {
    if (liveSocketRef.current) {
      liveSocketRef.current.close();
      liveSocketRef.current = null;
    }
    stopMicrophoneStream();
    stopQueuedLiveAudio();
    if (liveOutputAudioContextRef.current) {
      void liveOutputAudioContextRef.current.close();
      liveOutputAudioContextRef.current = null;
    }
  }, []);

  function sendLiveText(text: string) {
    const socket = liveSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ realtimeInput: { text } }));
    liveResponseTurnIdRef.current = null;
    return true;
  }

  function handleLiveToolCall(
    socket: WebSocket,
    functionCalls: Array<{ id?: string; name?: string; args?: unknown }>,
  ) {
    const functionResponses = functionCalls.map((call) => {
      const name = call.name ?? "unknown_tool";
      addOutcome({
        type: name.includes("message") ? "message" : name.includes("alert") ? "alert" : name.includes("transfer") ? "transfer" : "details",
        title: `Prepared action: ${formatLabel(name)}`,
        detail: "Handled during this test.",
        status: "Simulated",
      });
      return {
        id: call.id,
        name,
        response: {
          result: {
            ok: true,
            mode: "test",
            note: "Test mode simulated this action. No outside messages were sent.",
          },
        },
      };
    });
    socket.send(JSON.stringify({ toolResponse: { functionResponses } }));
  }

  function appendLiveSetupTurn(fragment: string) {
    const text = fragment.trim();
    if (!text) return;
    const activeTurnId = liveResponseTurnIdRef.current;
    if (activeTurnId) {
      setTranscript((current) =>
        current.map((turn) =>
          turn.id === activeTurnId ? { ...turn, text: joinTranscriptFragments(turn.text, text) } : turn,
        ),
      );
      return;
    }

    const id = nextLocalId("setup_live");
    liveResponseTurnIdRef.current = id;
    setTranscript((current) => [...current, { id, speaker: "setup", text }]);
  }

  function appendLiveCallerTurn(fragment: string) {
    const text = fragment.trim();
    if (!text) return;
    const activeTurnId = liveInputTurnIdRef.current;
    if (activeTurnId) {
      setTranscript((current) =>
        current.map((turn) =>
          turn.id === activeTurnId ? { ...turn, text: joinTranscriptFragments(turn.text, text) } : turn,
        ),
      );
      return;
    }

    const id = nextLocalId("caller_live");
    liveInputTurnIdRef.current = id;
    setTranscript((current) => [...current, { id, speaker: "caller", text }]);
  }

  function joinTranscriptFragments(current: string, fragment: string) {
    return /^[.,!?;:)]/.test(fragment) ? `${current}${fragment}` : `${current} ${fragment}`;
  }

  function addTurn(speaker: TranscriptTurn["speaker"], text: string) {
    setTranscript((current) => [...current, { id: nextLocalId(speaker), speaker, text }]);
  }

  function addOutcome(card: Omit<OutcomeCard, "id">) {
    setOutcomes((current) => {
      if (current.some((item) => item.type === card.type && item.title === card.title)) return current;
      return [...current, { ...card, id: nextLocalId(card.type) }];
    });
  }

  function runPrompt(prompt: SuggestedSetupTestPrompt) {
    if (!callActive) startCall();
    setUnknownQuestion(null);
    window.setTimeout(() => addTurn("caller", prompt.prompt), 120);
    window.setTimeout(() => sendLiveText(prompt.prompt), 180);
    window.setTimeout(() => {
      if (prompt.category === "approved_answer") {
        const answer = setup.approvedAnswers.find((item) => item.id === prompt.sourceId) ?? setup.approvedAnswers[0];
        addTurn("setup", answer?.answer ?? "I can take a message and have the team follow up.");
        return;
      }
      if (prompt.category === "service") {
        const service = setup.services.find((item) => item.id === prompt.sourceId) ?? setup.services[0];
        addTurn("setup", service?.approvedDescription ?? "I can collect the details and send them to the team.");
        return;
      }
      if (prompt.category === "appointment") {
        addTurn("setup", "Absolutely. May I have your name, callback number, and preferred time?");
        window.setTimeout(() => {
          addTurn("caller", "My name is Jamie. My number is 204-555-0184, and Thursday afternoon works.");
          addOutcome({ type: "details", title: "Contact details collected", detail: "Jamie - 204-555-0184", status: "Captured" });
          addOutcome({ type: "request", title: "Appointment request captured", detail: "Thursday afternoon", status: "Test request" });
          addOutcome({ type: "alert", title: "Owner alert prepared", detail: "New appointment request from Jamie", status: "Ready after activation" });
          window.setTimeout(() => addTurn("setup", setup.requestCapture.callerSummaryWording), 280);
        }, 420);
        return;
      }
      if (prompt.category === "urgent") {
        addTurn("setup", setup.hours.afterHours.urgentWording ?? "I can collect the urgent details and alert the business.");
        window.setTimeout(() => {
          addTurn("caller", "There is water leaking and I need help right away.");
          addOutcome({ type: "urgent", title: "Urgent call detected", detail: "Leak reported - alert prepared", status: "Test urgent route" });
          addOutcome({ type: "alert", title: "On-call alert prepared", detail: "Urgent request from test caller", status: "Ready after activation" });
        }, 420);
        return;
      }
      if (prompt.category === "message") {
        addTurn("setup", "Of course. What message would you like me to pass along, and what is the best number to reach you?");
        window.setTimeout(() => {
          addTurn("caller", "Please ask someone to call me tomorrow at 204-555-0119.");
          addOutcome({ type: "message", title: "Message captured", detail: "Please call tomorrow - 204-555-0119", status: "Ready for the business" });
          addOutcome({ type: "followup", title: "Caller confirmation prepared", detail: "Message received confirmation", status: "Ready after activation" });
          window.setTimeout(() => addTurn("setup", "I have the message and callback number ready for the team."), 260);
        }, 420);
        return;
      }

      const question = "Do you provide a warranty?";
      addTurn("caller", question);
      window.setTimeout(() => {
        const answer = setup.approvedAnswers.find((item) => /warranty/i.test(`${item.question} ${item.answer}`));
        addTurn("setup", answer?.answer ?? "I do not have that confirmed, but I can take a message for the team.");
        if (!answer) {
          setUnknownQuestion(question);
          setUpdateText("We provide a one-year warranty on approved work.");
        }
      }, 260);
    }, 420);
  }

  async function updateSetup() {
    const instruction = updateText.trim();
    if (!instruction) return;
    setUpdating(true);
    setUpdateStatus(null);
    try {
      const fullInstruction = unknownQuestion
        ? `Add an approved answer for the question "${unknownQuestion}": ${instruction}`
        : instruction;
      const response = await fetch("/api/dev/plan-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setup, instruction: fullInstruction }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Update failed.");
      const result = body.result as SetupAssistantResult;
      if (result.type === "proposal") {
        const applied = applySetupChange(setup, result.proposal);
        setSetup(applied.setup);
        setUpdateStatus("Updated. The answering setup can use this now.");
        setUnknownQuestion(null);
        setUpdateText("");
      } else if (result.type === "answer") {
        setUpdateStatus(result.answer);
      } else {
        setUpdateStatus(`${result.question}${result.choices.length ? ` ${result.choices.join(" / ")}` : ""}`);
      }
    } catch (error) {
      setUpdateStatus(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setUpdating(false);
    }
  }

  function applyAlertPhone() {
    const phone = alertPhone.trim();
    if (!phone) return;
    const contactIndex = setup.ownerAlerts.contacts.findIndex((contact) => contact.id === "contact_owner") >= 0
      ? setup.ownerAlerts.contacts.findIndex((contact) => contact.id === "contact_owner")
      : 0;
    const operations: SetupPatchOperation[] = [
      { op: "replace", path: `/ownerAlerts/contacts/${contactIndex}/sms`, value: phone },
      { op: "replace", path: "/ownerAlerts/channels", value: Array.from(new Set([...setup.ownerAlerts.channels, "sms"])) },
    ];
    const proposal: SetupChangeProposal = {
      id: nextLocalId("review"),
      baseRevision: setup.status.draftRevision,
      source: "manual_ui",
      summary: "Add owner alert phone",
      userInstruction: null,
      riskLevel: "high",
      requiresConfirmation: true,
      operations,
      affectedPaths: operations.map((operation) => operation.path),
      conflicts: [],
      clarification: null,
    };
    setSetup(applySetupChange(setup, proposal).setup);
  }

  async function saveAndContinue() {
    const testCall = {
      id: "test-call-1",
      startedAt: new Date().toISOString(),
      summary: transcript.length
        ? "Tested business questions, request handling, urgent routing, and message capture."
        : "Test call completed.",
      transcript,
      outcomes,
      setupRevision: setup.status.draftRevision,
      setupId: setup.setupId,
      audioChunkCount: liveAudioChunks,
    } satisfies StoredTestCall;
    await saveSbaWorkspace({ setup, testCall });
    router.push("/dashboard/calls");
  }

  const micStateLabel =
    micState === "active"
      ? "Microphone on"
      : micState === "muted"
        ? "Muted"
        : micState === "requesting"
          ? "Requesting microphone"
          : micState === "blocked"
            ? "Microphone blocked"
            : micState === "error"
              ? "Microphone unavailable"
              : "Microphone off";
  const voiceStateLabel =
    liveState === "ready"
      ? "Voice connected"
      : liveState === "connected"
        ? "Preparing voice"
        : liveState === "starting"
          ? "Connecting"
          : liveState === "error"
            ? "Voice issue"
            : liveState === "closed"
              ? "Call closed"
              : "Ready";
  const progressItems = [
    { label: "Setup built", done: true },
    { label: "Voice test", done: callEnded || callActive },
    { label: "Save", done: false },
  ];

  if (phase === "building") {
    return <BuildingScreen business={businessInput} activeStep={buildStep} importState={importState} />;
  }

  if (phase === "review") {
    return (
      <ReviewScreen
        setup={setup}
        readiness={readiness}
        alertPhone={alertPhone}
        setAlertPhone={setAlertPhone}
        onApplyPhone={applyAlertPhone}
        onBack={() => setPhase("testing")}
        onContinue={() => setPhase("save")}
      />
    );
  }

  if (phase === "save") {
    return (
      <SaveScreen
        email={email}
        setEmail={setEmail}
        onBack={() => setPhase("review")}
        onContinue={saveAndContinue}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFBFC] text-[#0F1115]">
      <TopBar businessName={businessName} />
      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[8px] border border-[#D6DAE1] bg-white px-5 py-5 shadow-[0_18px_60px_rgba(15,17,21,.05)] sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-[#045BFF]">Voice test</p>
              <h1 className="mt-2 text-[clamp(2rem,4vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[#0F1115]">
                Test the answering setup out loud.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#5B6472]">
                Speak as a caller, hear the answering voice respond, and fix the setup before anything goes live.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {progressItems.map((item, index) => (
                <span
                  key={item.label}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm font-semibold",
                    item.done ? "border-[#BFD5FF] bg-[#ECF3FF] text-[#045BFF]" : "border-[#D6DAE1] bg-[#FAFBFC] text-[#5B6472]",
                  )}
                >
                  <span className={cn("flex size-5 items-center justify-center rounded-full text-[11px]", item.done ? "bg-[#045BFF] text-white" : "bg-[#E7EAF0] text-[#5B6472]")}>
                    {item.done ? <Check className="size-3" /> : index + 1}
                  </span>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          {importMessage ? (
            <div className={cn("mt-5 rounded-[6px] border px-4 py-3 text-sm", importState === "fallback" ? "border-[#F2C76A] bg-[#FFF8E6] text-[#6F4A00]" : "border-[#BFE5D3] bg-[#F0FBF6] text-[#17633F]")}>
              {importMessage}
            </div>
          ) : null}
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="overflow-hidden rounded-[8px] border-[#D6DAE1] bg-[#0F1115] text-white shadow-[0_18px_60px_rgba(15,17,21,.10)]">
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white/60">{voiceStateLabel}</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Browser voice call</h2>
                  </div>
                  <span className={cn("flex size-11 items-center justify-center rounded-[8px]", callActive ? "bg-[#045BFF]" : "bg-white/10")}>
                    {callActive ? <AudioLines className="size-5" /> : <PhoneCall className="size-5" />}
                  </span>
                </div>

                <div className="mt-8 rounded-[8px] border border-white/10 bg-white/[0.06] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{callActive ? "Listening now" : callEnded ? "Test complete" : "Ready to start"}</p>
                      <p className="mt-1 text-sm leading-6 text-white/60">{liveMessage}</p>
                    </div>
                    <span className={cn("size-3 rounded-full", liveState === "ready" ? "bg-[#25C26E]" : liveState === "error" ? "bg-[#FFB020]" : callActive ? "bg-[#045BFF]" : "bg-white/25")} />
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#045BFF] transition-all duration-150" style={{ width: `${Math.max(8, micLevel * 100)}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/55">
                    <span>{micStateLabel}</span>
                    {liveRuntimeIdentity ? <span>Secure voice session</span> : null}
                    {liveAudioChunks ? <span>Voice reply received</span> : null}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-[56px_1fr] gap-3">
                  <button
                    type="button"
                    onClick={() => setMuted((value) => !value)}
                    disabled={!callActive}
                    className="flex h-14 items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.08] text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                  </button>
                  {!callActive ? (
                    <Button onClick={() => void startCall()} className="h-14 rounded-[8px] bg-[#045BFF] text-base font-semibold text-white hover:bg-[#034AD1]">
                      <Phone className="size-4" /> {callEnded ? "Run another voice test" : "Start voice test"}
                    </Button>
                  ) : (
                    <Button onClick={endCall} className="h-14 rounded-[8px] bg-white text-base font-semibold text-[#0F1115] hover:bg-[#F3F5F8]">
                      <PhoneOff className="size-4" /> End test
                    </Button>
                  )}
                </div>

                {callEnded ? (
                  <Button onClick={() => setPhase(readiness.liveReady ? "save" : "review")} className="mt-4 h-12 w-full rounded-[8px] bg-[#045BFF] font-semibold text-white hover:bg-[#034AD1]">
                    Continue <ArrowRight className="size-4" />
                  </Button>
                ) : null}
              </div>
            </Card>

            <Card className="flex min-h-[620px] flex-col overflow-hidden rounded-[8px] border-[#D6DAE1] bg-white">
              <div className="border-b border-[#D6DAE1] px-5 py-4">
                <p className="text-base font-semibold text-[#0F1115]">Live transcript</p>
                <p className="mt-1 text-sm text-[#667085]">Spoken caller turns and answering responses appear here.</p>
              </div>
              <div className="flex-1 space-y-4 overflow-auto bg-[#FAFBFC] p-5">
                {transcript.length ? transcript.map((turn) => (
                  <div key={turn.id} className={cn("flex", turn.speaker === "caller" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[86%] rounded-[8px] px-4 py-3 text-sm leading-6 shadow-sm", turn.speaker === "caller" ? "bg-[#0F1115] text-white" : "border border-[#D6DAE1] bg-white text-[#273142]")}>
                      <p className={cn("mb-1 text-xs font-semibold", turn.speaker === "caller" ? "text-white/55" : "text-[#667085]")}>{turn.speaker === "caller" ? "Caller" : "Answering setup"}</p>
                      {turn.text}
                    </div>
                  </div>
                )) : (
                  <div className="flex h-full min-h-72 items-center justify-center text-center">
                    <div>
                      <div className="mx-auto flex size-12 items-center justify-center rounded-[8px] border border-[#D6DAE1] bg-white text-[#045BFF]"><Play className="size-5" /></div>
                      <p className="mt-4 font-semibold text-[#0F1115]">Start the voice test</p>
                      <p className="mt-1 max-w-sm text-sm leading-6 text-[#667085]">Speak through the browser microphone or use a suggested phrase.</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card className="rounded-[8px] border-[#D6DAE1] bg-white p-5">
              <div className="flex items-center gap-2">
                <Mic className="size-4 text-[#045BFF]" />
                <h2 className="font-semibold text-[#0F1115]">Suggested caller phrases</h2>
              </div>
              <div className="mt-4 space-y-2.5">
                {suggestions.slice(0, 5).map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => runPrompt(prompt)}
                    className="group w-full rounded-[8px] border border-[#D6DAE1] bg-[#FAFBFC] p-3 text-left transition hover:border-[#9DBEFF] hover:bg-[#ECF3FF]"
                  >
                    <p className="text-xs font-semibold text-[#667085]">{formatLabel(prompt.category)}</p>
                    <p className="mt-1 text-sm font-medium leading-5 text-[#273142]">{prompt.prompt}</p>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="rounded-[8px] border-[#D6DAE1] bg-white p-5">
              <div className="flex items-center gap-2">
                <WandSparkles className="size-4 text-[#045BFF]" />
                <h2 className="font-semibold text-[#0F1115]">Update the setup</h2>
              </div>
              <p className="mt-1 text-sm leading-6 text-[#667085]">Tell the assistant what changed. It updates the same setup used by the test and dashboard.</p>

              {unknownQuestion ? (
                <div className="mt-4 rounded-[8px] border border-[#F2C76A] bg-[#FFF8E6] p-3">
                  <p className="text-xs font-semibold text-[#6F4A00]">Missing approved answer</p>
                  <p className="mt-1 text-sm font-semibold text-[#2F2200]">{unknownQuestion}</p>
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                <Textarea value={updateText} onChange={(event) => setUpdateText(event.target.value)} placeholder="Example: answer warranty questions like this..." className="min-h-24 rounded-[8px] border-[#D6DAE1]" />
                <Button onClick={() => void updateSetup()} disabled={!updateText.trim() || updating} className="h-auto w-12 shrink-0 rounded-[8px] bg-[#045BFF] px-0 text-white hover:bg-[#034AD1]">
                  {updating ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
              {updateStatus ? <div className="mt-3 rounded-[8px] border border-[#BFE5D3] bg-[#F0FBF6] p-3 text-sm leading-6 text-[#17633F]">{updateStatus}</div> : null}
            </Card>

            <Card className="rounded-[8px] border-[#D6DAE1] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#045BFF]" /><h2 className="font-semibold text-[#0F1115]">Call outputs</h2></div>
                <span className="rounded-[6px] border border-[#D6DAE1] bg-[#FAFBFC] px-2 py-1 text-xs font-semibold text-[#667085]">{outcomes.length}</span>
              </div>
              <div className="mt-4 space-y-2.5">
                {outcomes.length ? outcomes.map((outcome) => <Outcome key={outcome.id} outcome={outcome} />) : (
                  <div className="rounded-[8px] border border-dashed border-[#D6DAE1] p-5 text-center text-sm leading-6 text-[#667085]">Requests, messages, alerts, and details will appear here during the test.</div>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

function TopBar({ businessName }: { businessName: string }) {
  return (
    <header className="border-b border-[#D6DAE1] bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold tracking-tight text-[#0F1115]">Small Business Answering</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-[6px] border border-[#D6DAE1] bg-[#FAFBFC] px-3 py-1.5 text-xs font-semibold text-[#5B6472]"><Building2 className="size-3.5" /> <span className="truncate">{businessName}</span></div>
      </div>
    </header>
  );
}

function BuildingScreen({ business, activeStep, importState }: { business: string; activeStep: number; importState: ImportState }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#FAFBFC] px-5 py-12 text-[#0F1115]">
      <Card className="w-full max-w-3xl overflow-hidden rounded-[8px] border-[#D6DAE1] bg-white shadow-[0_24px_80px_rgba(15,17,21,.08)]">
        <div className="border-b border-[#D6DAE1] bg-[#0F1115] px-7 py-8 text-white sm:px-8">
          <p className="text-sm font-semibold text-white/60">Small Business Answering</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Building your answering setup</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Reading {business} and preparing one setup for voice testing, owner review, and the dashboard.</p>
        </div>
        <div className="p-7 sm:p-8">
          <div className="space-y-4">
            {buildSteps.map((step, index) => {
              const done = index < activeStep;
              const active = index === activeStep;
              return (
                <div key={step} className="flex items-center gap-3">
                  <span className={cn("flex size-8 items-center justify-center rounded-[6px] border", done ? "border-[#BFE5D3] bg-[#F0FBF6] text-[#17633F]" : active ? "border-[#BFD5FF] bg-[#ECF3FF] text-[#045BFF]" : "border-[#D6DAE1] bg-white text-[#9AA3B2]")}>
                    {done ? <Check className="size-4" /> : active ? <LoaderCircle className="size-4 animate-spin" /> : <Circle className="size-3" />}
                  </span>
                  <span className={cn("text-sm font-semibold", done || active ? "text-[#273142]" : "text-[#9AA3B2]")}>{step}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-[#E7EAF0]"><div className="h-full rounded-full bg-[#045BFF] transition-all duration-500" style={{ width: `${((activeStep + 1) / buildSteps.length) * 100}%` }} /></div>
          <p className="mt-4 text-xs font-semibold text-[#667085]">{importState === "reading" ? "Reading website facts into the answering setup." : "No calls go live during setup."}</p>
        </div>
      </Card>
    </div>
  );
}

function Outcome({ outcome }: { outcome: OutcomeCard }) {
  const icons = {
    details: ContactRound,
    request: CalendarCheck2,
    message: MessageSquareText,
    followup: Send,
    alert: Bell,
    transfer: Route,
    urgent: ShieldAlert,
  };
  const Icon = icons[outcome.type];
  return (
    <div className="rounded-[8px] border border-[#D6DAE1] p-3">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-[#ECF3FF] text-[#045BFF]"><Icon className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F1115]">{outcome.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#667085]">{outcome.detail}</p>
          <p className="mt-2 text-xs font-semibold text-[#17633F]">{outcome.status}</p>
        </div>
      </div>
    </div>
  );
}

function ReviewScreen({
  setup,
  readiness,
  alertPhone,
  setAlertPhone,
  onApplyPhone,
  onBack,
  onContinue,
}: {
  setup: AnsweringSetup;
  readiness: ReturnType<typeof calculateAnsweringSetupReadiness>;
  alertPhone: string;
  setAlertPhone: (value: string) => void;
  onApplyPhone: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#FAFBFC] text-[#0F1115]">
      <TopBar businessName={setup.business.name} />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-sm font-semibold text-[#045BFF]">{readiness.allReviewItems.length} activation item{readiness.allReviewItems.length === 1 ? "" : "s"}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#0F1115]">Before real calls are answered</h1>
        <p className="mt-3 text-sm leading-6 text-[#667085]">Only launch requirements appear here. These items come from the saved answering setup.</p>

        <div className="mt-7 space-y-4">
          <Card className="rounded-[8px] border-[#D6DAE1] bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-[8px] bg-[#ECF3FF] text-[#045BFF]"><Phone className="size-5" /></span>
              <div className="flex-1">
                <h2 className="font-semibold text-[#0F1115]">Where should messages and important alerts go?</h2>
                <p className="mt-1 text-sm leading-6 text-[#667085]">Add the owner or on-call number that should receive alerts after activation.</p>
                <div className="mt-4 flex gap-2">
                  <Input value={alertPhone} onChange={(event) => setAlertPhone(event.target.value)} placeholder="Phone number" className="rounded-[8px] border-[#D6DAE1]" />
                  <Button variant="secondary" onClick={onApplyPhone} disabled={!alertPhone.trim()} className="rounded-[8px]">Use number</Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[8px] border-[#D6DAE1] bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-[8px] bg-[#ECF3FF] text-[#045BFF]"><Clock3 className="size-5" /></span>
              <div className="flex-1">
                <h2 className="font-semibold text-[#0F1115]">After-hours handling</h2>
                <p className="mt-1 text-sm leading-6 text-[#667085]">{setup.hours.afterHours.callerWording}</p>
                <Select className="mt-4 rounded-[8px] border-[#D6DAE1]" value={setup.hours.afterHours.mode} disabled>
                  <option value="take_message">Take a message</option>
                  <option value="urgent_only">Urgent only</option>
                  <option value="send_booking_link">Send booking link</option>
                  <option value="closed_message">Closed message</option>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="rounded-[8px]"><ArrowLeft className="size-4" /> Back to test</Button>
          <Button onClick={onContinue} className="rounded-[8px] bg-[#045BFF] text-white hover:bg-[#034AD1]">Save setup <ArrowRight className="size-4" /></Button>
        </div>
      </main>
    </div>
  );
}

function SaveScreen({ email, setEmail, onBack, onContinue }: { email: string; setEmail: (value: string) => void; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#FAFBFC] px-5 py-12 text-[#0F1115]">
      <Card className="w-full max-w-lg rounded-[8px] border-[#D6DAE1] bg-white p-7 shadow-[0_24px_80px_rgba(15,17,21,.08)] sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-[8px] bg-[#ECF3FF] text-[#045BFF]"><Save className="size-5" /></div>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.035em] text-[#0F1115]">Save your answering setup</h1>
        <p className="mt-2 text-sm leading-6 text-[#667085]">Keep this setup, owner updates, and test call so you can continue or activate it later.</p>
        <button onClick={onContinue} className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-[8px] border border-[#D6DAE1] bg-white text-sm font-semibold text-[#0F1115] shadow-sm transition hover:bg-[#FAFBFC]">
          <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-400 text-xs font-bold text-white">G</span>
          Continue with Google
        </button>
        <div className="my-5 flex items-center gap-3 text-xs font-semibold text-[#9AA3B2]"><span className="h-px flex-1 bg-[#D6DAE1]" />or<span className="h-px flex-1 bg-[#D6DAE1]" /></div>
        <Field label="Work email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="rounded-[8px] border-[#D6DAE1]" />
        </Field>
        <Button className="mt-3 w-full rounded-[8px] bg-[#045BFF] text-white hover:bg-[#034AD1]" onClick={onContinue} disabled={!email.trim()}><Mail className="size-4" /> Email me a secure link</Button>
        <p className="mt-4 text-center text-xs leading-5 text-[#667085]">Creates a free Small Business Answering account. No card required.</p>
        <button onClick={onBack} className="mt-5 w-full text-center text-sm font-semibold text-[#667085] hover:text-[#0F1115]">Back</button>
      </Card>
    </div>
  );
}
