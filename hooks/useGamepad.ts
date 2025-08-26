import { useEffect, useCallback, useRef } from 'react';

// Standard gamepad button mapping for face buttons (e.g., A, B, X, Y on Xbox)
const FACE_BUTTONS_MAP = [0, 1, 2, 3];

interface GamepadActions {
  onChoiceSelect?: (index: number) => void;
  // Other actions like onCancel can be added here if needed
}

export const useGamepad = (actions: GamepadActions) => {
  const animationFrameId = useRef<number | undefined>(undefined);
  const lastButtonState = useRef<Record<number, boolean>>({});
  const actionsRef = useRef(actions);

  // Keep the actions ref up to date without re-triggering effects
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const pollGamepads = useCallback(() => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0]; // Use the first connected gamepad

    if (gp) {
      gp.buttons.forEach((button, index) => {
        const isPressed = button.pressed;
        const wasPressed = lastButtonState.current[index];

        if (isPressed && !wasPressed) {
          // Check if a face button was pressed
          if (FACE_BUTTONS_MAP.includes(index)) {
            // Map button index to choice index (0, 1, 2, 3)
            const choiceIndex = FACE_BUTTONS_MAP.indexOf(index);
            actionsRef.current.onChoiceSelect?.(choiceIndex);
          }
        }
        lastButtonState.current[index] = isPressed;
      });
    }
    animationFrameId.current = requestAnimationFrame(pollGamepads);
  }, []);

  useEffect(() => {
    const startPolling = () => {
      if (!animationFrameId.current) {
        animationFrameId.current = requestAnimationFrame(pollGamepads);
      }
    };

    const stopPolling = () => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = undefined;
        }
    };
    
    const handleConnect = () => {
      startPolling();
    };

    const handleDisconnect = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const isAnyGamepadConnected = Array.from(gamepads).some(g => g !== null);
      if(!isAnyGamepadConnected) {
          stopPolling();
      }
    };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    if (Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(g => g !== null)) {
        startPolling();
    }

    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
      stopPolling();
    };
  }, [pollGamepads]);
};