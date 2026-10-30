import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VoiceHUD, type VoiceState } from "@/components/chat/VoiceHUD";
import { type PendingVoiceAction } from "@/lib/voiceActions";

describe("VoiceHUD - Talkative Voice Overlay & Dynamic Visualizer", () => {
  const defaultProps = {
    state: "listening" as VoiceState,
    interimTranscript: "",
    finalTranscript: "",
    speakingSentence: "",
    pendingAction: null as PendingVoiceAction | null,
    onConfirmAction: vi.fn(),
    onCancelAction: vi.fn(),
    onInterrupt: vi.fn(),
    onExitVoiceMode: vi.fn(),
    actionExecuting: false,
    ttsProvider: "web-speech" as const,
    vexylStyle: "warm" as const,
    onChangeVexylStyle: vi.fn(),
    micStream: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Talkative Voice Assistant overlay header and controls", () => {
    render(<VoiceHUD {...defaultProps} />);

    expect(screen.getByText("Talkative Voice Assistant")).toBeInTheDocument();
    expect(screen.getByText("Natural Spoken Medical Consultation")).toBeInTheDocument();
    expect(screen.getByLabelText("Close voice overlay")).toBeInTheDocument();
  });

  it("displays flat listening status when user is silent", () => {
    render(<VoiceHUD {...defaultProps} state="listening" interimTranscript="" />);

    expect(screen.getByText("Listening for your voice (speak anytime)...")).toBeInTheDocument();
  });

  it("displays hearing status and interim speech text when user speaks", () => {
    render(
      <VoiceHUD
        {...defaultProps}
        state="listening"
        interimTranscript="I have a headache since morning"
      />
    );

    expect(screen.getByText("Hearing your voice...")).toBeInTheDocument();
    expect(screen.getByText(/I have a headache since morning/i)).toBeInTheDocument();
  });

  it("displays thinking status with synthesis indicator when state is thinking", () => {
    render(<VoiceHUD {...defaultProps} state="thinking" />);

    expect(screen.getByText("Consulting clinical guidelines...")).toBeInTheDocument();
  });

  it("displays speaking status, current sentence, and barge-in button when assistant speaks", () => {
    const onInterrupt = vi.fn();
    render(
      <VoiceHUD
        {...defaultProps}
        state="speaking"
        speakingSentence="Please ensure you rest and drink plenty of fluids."
        onInterrupt={onInterrupt}
      />
    );

    expect(screen.getByText(/Assistant Speaking/i)).toBeInTheDocument();
    expect(screen.getByText("Please ensure you rest and drink plenty of fluids.")).toBeInTheDocument();

    const interruptBtn = screen.getByRole("button", { name: /interrupt & speak/i });
    expect(interruptBtn).toBeInTheDocument();
    fireEvent.click(interruptBtn);
    expect(onInterrupt).toHaveBeenCalledTimes(1);
  });

  it("displays confirmation card and handles confirm / cancel actions", () => {
    const mockPendingAction: PendingVoiceAction = {
      id: "act-1",
      type: "book",
      doctor: {
        id: "doc-1",
        name: "Dr. Sarah Lin, MD",
        specialty: "Cardiology",
        email: "sarah.lin@clinic.org",
        clinicRoom: "Cardio Wing 2B",
        avatar_url: "https://example.com/avatar.jpg",
        bio: "Cardiologist",
        calendar_id: "lin@clinic.org",
        clinicalCode: "CARDIO-1",
      },
      startTime: "2026-11-03T14:00:00Z",
      endTime: "2026-11-03T14:30:00Z",
      dateDisplay: "Tuesday, Nov 3",
      timeDisplay: "2:00 PM",
      consultationType: "direct",
      spokenPrompt: "Would you like me to confirm your in-person appointment with Dr. Sarah Lin for Tuesday at 2 PM?",
    };

    const onConfirmAction = vi.fn();
    const onCancelAction = vi.fn();

    render(
      <VoiceHUD
        {...defaultProps}
        state="awaiting_confirmation"
        pendingAction={mockPendingAction}
        onConfirmAction={onConfirmAction}
        onCancelAction={onCancelAction}
      />
    );

    expect(screen.getByText(/Confirm Appointment Booking/i)).toBeInTheDocument();
    expect(screen.getByText(/Cardiology/)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Sarah Lin, MD/)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /confirm action/i });
    fireEvent.click(confirmBtn);
    expect(onConfirmAction).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(onCancelAction).toHaveBeenCalledTimes(1);
  });

  it("triggers exitVoiceMode when close button is clicked", () => {
    const onExit = vi.fn();
    render(<VoiceHUD {...defaultProps} onExitVoiceMode={onExit} />);

    const closeBtn = screen.getByLabelText("Close voice overlay");
    fireEvent.click(closeBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("triggers onChangeVexylStyle when tone is changed", () => {
    const onChangeStyle = vi.fn();
    render(<VoiceHUD {...defaultProps} onChangeVexylStyle={onChangeStyle} />);

    const select = screen.getByLabelText("Select Bedside Tone");
    fireEvent.change(select, { target: { value: "formal" } });
    expect(onChangeStyle).toHaveBeenCalledWith("formal");
  });
});
