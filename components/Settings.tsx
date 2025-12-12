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
  const [councilModels, setCouncilModels] = useState<string[]>([
    "",
    "",
    "",
    "",
  ]);
  const [chairmanModel, setChairmanModel] = useState<string>("");

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
      setCouncilModels(settings.councilModels);
      setChairmanModel(settings.chairmanModel);
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
    // Validate that all 4 council models are selected
    if (councilModels.some((model) => !model)) {
      toast.error("Please select all 4 council models");
      return;
    }

    if (!chairmanModel) {
      toast.error("Please select a chairman model");
      return;
    }

    try {
      setLoading(true);
      await api.updateSettings(councilModels, chairmanModel);
      toast.success("Settings saved successfully");
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
            Configure the default models for new conversations. Select 4 council
            models and 1 chairman model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Council Models */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Council Models (4 required)</h3>
            <p className="text-xs text-gray-500">
              These models will deliberate on each question in Stage 1 and
              evaluate responses in Stage 2.
            </p>
            {councilModels.map((modelId, index) => (
              <div key={index} className="space-y-2">
                <label className="text-sm text-gray-700">
                  Council Model {index + 1}
                </label>
                <ModelSelect
                  value={modelId}
                  onValueChange={(value) => updateCouncilModel(index, value)}
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
            <h3 className="text-sm font-medium">Chairman Model</h3>
            <p className="text-xs text-gray-500">
              This model will synthesize the final response in Stage 3 based on
              all council deliberations.
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
