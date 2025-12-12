"use client";

import { useState, useRef, useEffect } from "react";

interface PromptSettingsProps {
  useCouncil: boolean;
  onCouncilChange: (value: boolean) => void;
}

export default function PromptSettings({
  useCouncil,
  onCouncilChange,
}: PromptSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Settings Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded-lg transition-colors"
        title="Prompt settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="20"
          height="20"
        >
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9.5 14a3 3 0 1 1 0 6a3 3 0 0 1 0-6Zm5-10a3 3 0 1 0 0 6a3 3 0 0 0 0-6Z" />
            <path
              strokeLinecap="round"
              d="M11 7H6M3 7H2m11 10h5m3 0h1M2 17h4M22 7h-4"
            />
          </g>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-neutral-900 rounded-xl ring-1 ring-neutral-800 shadow-2xl overflow-hidden z-50">
          <div className="p-3 border-b border-neutral-800">
            <h3 className="text-sm font-medium text-neutral-200">
              Prompt Settings
            </h3>
          </div>

          <div className="p-3 space-y-1">
            {/* Council Mode Toggle */}
            <button
              type="button"
              onClick={() => onCouncilChange(!useCouncil)}
              className="w-full flex items-center justify-between p-3 hover:bg-neutral-800/50 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-neutral-400 group-hover:text-neutral-300"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <div className="text-left">
                  <div className="text-sm text-neutral-200">Council mode</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Multi-model deliberation
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <div
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  useCouncil ? "bg-primary" : "bg-neutral-700"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    useCouncil ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
