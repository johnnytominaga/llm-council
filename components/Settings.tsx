"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNCIL_MODELS, CHAIRMAN_MODEL } from "@/lib/config";
import PromptEditor from "@/components/PromptEditor";
import { DEFAULT_PROMPTS } from "@/lib/prompt-templates";

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Model {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

interface ModelSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  availableModels: Model[];
  disabled: boolean;
  placeholder: string;
  defaultModels: string[];
}

function ModelSelect({
  value,
  onValueChange,
  availableModels,
  disabled,
  placeholder,
  defaultModels,
}: ModelSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredModels = searchTerm
    ? availableModels.filter(
        (model) =>
          model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          model.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableModels;

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchTerm("");
    }
  }, [isOpen]);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div
          className="sticky top-0 bg-neutral-900 p-2 border-b border-neutral-800 z-10"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            type="text"
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
            onKeyDown={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredModels.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-gray-500">
              No models found
            </div>
          ) : (
            filteredModels.map((model) => {
              const isDefault = defaultModels.includes(model.id);
              return (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{model.name}</span>
                    {isDefault && (
                      <span className="ml-2 text-xs bg-yellow-100 text-neutral-700 px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

export default function Settings({ open, onOpenChange }: SettingsProps) {
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [mode, setMode] = useState<"single" | "council">("single");
  const [singleModel, setSingleModel] = useState<string>("");
  const [councilModels, setCouncilModels] = useState<string[]>([
    "",
    "",
    "",
    "",
  ]);
  const [chairmanModel, setChairmanModel] = useState<string>("");
  const [preprocessModel, setPreprocessModel] = useState<string>("");
  const [showCustomPrompts, setShowCustomPrompts] = useState(false);
  const [stage1Prompt, setStage1Prompt] = useState<string>(
    DEFAULT_PROMPTS.stage1
  );
  const [stage2Prompt, setStage2Prompt] = useState<string>(
    DEFAULT_PROMPTS.stage2
  );
  const [stage3Prompt, setStage3Prompt] = useState<string>(
    DEFAULT_PROMPTS.stage3
  );
  const [preprocessPrompt, setPreprocessPrompt] = useState<string>(
    DEFAULT_PROMPTS.preprocessing
  );

  // Load settings and available models
  useEffect(() => {
    if (open) {
      loadSettings();
      loadAvailableModels();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      setMode(settings.mode || "single");
      setSingleModel(settings.singleModel || "");
      setCouncilModels(settings.councilModels || ["", "", "", ""]);
      setChairmanModel(settings.chairmanModel || "");
      setPreprocessModel(settings.preprocessModel || "");
      // Load custom prompts (use defaults if not set)
      setStage1Prompt(settings.stage1Prompt || DEFAULT_PROMPTS.stage1);
      setStage2Prompt(settings.stage2Prompt || DEFAULT_PROMPTS.stage2);
      setStage3Prompt(settings.stage3Prompt || DEFAULT_PROMPTS.stage3);
      setPreprocessPrompt(
        settings.preprocessPrompt || DEFAULT_PROMPTS.preprocessing
      );
      // Show custom prompts section if any are customized
      setShowCustomPrompts(
        !!(
          settings.stage1Prompt ||
          settings.stage2Prompt ||
          settings.stage3Prompt ||
          settings.preprocessPrompt
        )
      );
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    }
  };

  const loadAvailableModels = async () => {
    try {
      setLoadingModels(true);
      const data = await api.getAvailableModels();
      // Sort models alphabetically by name
      const sortedModels = data.models.sort((a: Model, b: Model) =>
        a.name.localeCompare(b.name)
      );
      setAvailableModels(sortedModels);
    } catch (error) {
      console.error("Failed to load models:", error);
      toast.error("Failed to load available models");
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = async () => {
    // Validate based on mode
    if (mode === "single") {
      if (!singleModel) {
        toast.error("Please select a single model");
        return;
      }
    } else {
      // council mode
      // Validate that all 4 council models are selected
      if (councilModels.some((model) => !model)) {
        toast.error("Please select all 4 council models");
        return;
      }

      if (!chairmanModel) {
        toast.error("Please select a chairman model");
        return;
      }
    }

    try {
      setLoading(true);
      await api.updateSettings({
        mode,
        singleModel,
        councilModels,
        chairmanModel,
        // Only save preprocessing for council mode
        preprocessModel: mode === "council" ? preprocessModel || null : null,
        // Save custom prompts (null if using defaults)
        stage1Prompt:
          stage1Prompt !== DEFAULT_PROMPTS.stage1 ? stage1Prompt : null,
        stage2Prompt:
          stage2Prompt !== DEFAULT_PROMPTS.stage2 ? stage2Prompt : null,
        stage3Prompt:
          stage3Prompt !== DEFAULT_PROMPTS.stage3 ? stage3Prompt : null,
        preprocessPrompt:
          preprocessPrompt !== DEFAULT_PROMPTS.preprocessing
            ? preprocessPrompt
            : null,
      });
      toast.success("Settings saved successfully");

      // Dispatch custom event to notify other components that settings changed
      window.dispatchEvent(new CustomEvent("settingsChanged"));

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const updateCouncilModel = (index: number, value: string) => {
    const newModels = [...councilModels];
    newModels[index] = value;
    setCouncilModels(newModels);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Model Settings</DialogTitle>
          <DialogDescription>
            Configure the default behavior and models for new conversations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mode Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Response Mode</h3>
            <p className="text-xs text-gray-500">
              Choose how messages are processed by default (can be overridden
              per message)
            </p>
            <div className="space-y-2">
              <label className="flex bg-neutral-900 items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-neutral-800/50 transition-colors">
                <input
                  type="radio"
                  name="mode"
                  value="single"
                  checked={mode === "single"}
                  onChange={() => setMode("single")}
                  className="mt-1 appearance-none w-4 h-4 rounded-full border border-neutral-800 bg-neutral-900 checked:bg-primary checked:border-primary"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Single Model</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Fast and cost-effective. Uses one model per query (approx.
                    75% cheaper).
                  </div>
                </div>
              </label>
              <label className="flex bg-neutral-900 items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-neutral-800/50 transition-colors">
                <input
                  type="radio"
                  name="mode"
                  value="council"
                  checked={mode === "council"}
                  onChange={() => setMode("council")}
                  className="mt-1 appearance-none w-4 h-4 rounded-full border border-neutral-800 bg-neutral-900 checked:bg-primary checked:border-primary"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">Council Mode</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Higher cost but better quality. Uses 3-stage deliberation
                    across 4+ models.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Single Model Section */}
          {mode === "single" && (
            <div className="space-y-4 p-4 bg-neutral-900 rounded-lg border border-neutral-800">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-200">
                  Single Model
                </h3>
                <p className="text-xs text-neutral-500">
                  This model will handle all queries in single mode.
                </p>
                <ModelSelect
                  value={singleModel}
                  onValueChange={setSingleModel}
                  availableModels={availableModels}
                  disabled={loadingModels}
                  placeholder={
                    loadingModels ? "Loading models..." : "Select a model"
                  }
                  defaultModels={COUNCIL_MODELS}
                />
              </div>
            </div>
          )}

          {/* Council Mode Section */}
          {mode === "council" && (
            <div className="space-y-4 p-4 bg-neutral-900 rounded-lg border border-neutral-800">
              {/* Preprocessing Model (Optional - at the top) */}
              <div className="space-y-2 pb-4 border-b border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-200">
                  Preprocessing Model (Optional)
                </h3>
                <p className="text-xs text-neutral-500">
                  If set, this model will summarize conversation history before
                  the council deliberation, providing better context. Adds one
                  API call per message but improves quality.
                </p>
                <ModelSelect
                  value={preprocessModel}
                  onValueChange={setPreprocessModel}
                  availableModels={availableModels}
                  disabled={loadingModels}
                  placeholder={
                    loadingModels ? "Loading models..." : "None (optional)"
                  }
                  defaultModels={[]}
                />
              </div>

              {/* Council Models */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-200">
                    Council Models (4 required)
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    These models will deliberate on each question in Stage 1 and
                    evaluate responses in Stage 2.
                  </p>
                </div>
                {councilModels.map((modelId, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-sm text-neutral-400">
                      Council Model {index + 1}
                    </label>
                    <ModelSelect
                      value={modelId}
                      onValueChange={(value) =>
                        updateCouncilModel(index, value)
                      }
                      availableModels={availableModels}
                      disabled={loadingModels}
                      placeholder={
                        loadingModels ? "Loading models..." : "Select a model"
                      }
                      defaultModels={COUNCIL_MODELS}
                    />
                  </div>
                ))}
              </div>

              {/* Chairman Model */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-200">
                  Chairman Model
                </h3>
                <p className="text-xs text-neutral-500">
                  This model will synthesize the final response in Stage 3 based
                  on all council deliberations.
                </p>
                <ModelSelect
                  value={chairmanModel}
                  onValueChange={setChairmanModel}
                  availableModels={availableModels}
                  disabled={loadingModels}
                  placeholder={
                    loadingModels ? "Loading models..." : "Select a model"
                  }
                  defaultModels={[CHAIRMAN_MODEL]}
                />
              </div>
            </div>
          )}

          {/* Custom Prompts Section (Advanced) */}
          <div className="space-y-3 mt-6">
            <button
              type="button"
              onClick={() => setShowCustomPrompts(!showCustomPrompts)}
              className="flex items-center justify-between w-full p-3 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-neutral-400"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <div className="text-left">
                  <h3 className="text-sm font-medium text-neutral-200">
                    Custom Prompts (Advanced)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Customize the prompts used in each stage of the council
                    deliberation
                  </p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-neutral-400 transition-transform ${
                  showCustomPrompts ? "rotate-180" : ""
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showCustomPrompts && (
              <div className="space-y-6 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-900/50 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-neutral-200 flex-shrink-0 mt-0.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <div className="text-xs text-neutral-200">
                      <p className="font-medium mb-1">About Custom Prompts:</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>
                          Use template variables like{" "}
                          <code className="bg-neutral-800 px-1 py-0.5 rounded">
                            {"{question}"}
                          </code>{" "}
                          to insert dynamic data
                        </li>
                        <li>
                          Required variables must be included for the prompts to
                          work
                        </li>
                        <li>
                          Click "Restore Default" to reset a prompt to its
                          original version
                        </li>
                        <li>Empty prompts will use the default templates</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Stage 1 Prompt */}
                <PromptEditor
                  stage="stage1"
                  value={stage1Prompt}
                  onChange={setStage1Prompt}
                  onRestoreDefault={() =>
                    setStage1Prompt(DEFAULT_PROMPTS.stage1)
                  }
                />

                {/* Stage 2 Prompt */}
                <PromptEditor
                  stage="stage2"
                  value={stage2Prompt}
                  onChange={setStage2Prompt}
                  onRestoreDefault={() =>
                    setStage2Prompt(DEFAULT_PROMPTS.stage2)
                  }
                />

                {/* Stage 3 Prompt */}
                <PromptEditor
                  stage="stage3"
                  value={stage3Prompt}
                  onChange={setStage3Prompt}
                  onRestoreDefault={() =>
                    setStage3Prompt(DEFAULT_PROMPTS.stage3)
                  }
                />

                {/* Preprocessing Prompt (only show if council mode or if already customized) */}
                {(mode === "council" ||
                  preprocessPrompt !== DEFAULT_PROMPTS.preprocessing) && (
                  <PromptEditor
                    stage="preprocessing"
                    value={preprocessPrompt}
                    onChange={setPreprocessPrompt}
                    onRestoreDefault={() =>
                      setPreprocessPrompt(DEFAULT_PROMPTS.preprocessing)
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || loadingModels}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
