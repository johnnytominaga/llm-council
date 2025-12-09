'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export default function Settings({ open, onOpenChange }: SettingsProps) {
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [councilModels, setCouncilModels] = useState<string[]>(['', '', '', '']);
  const [chairmanModel, setChairmanModel] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
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
      console.error('Failed to load models:', error);
      toast.error('Failed to load available models');
    } finally {
      setLoadingModels(false);
    }
  };

  // Filter and sort models based on search term
  const filteredModels = useMemo(() => {
    if (!searchTerm) return availableModels;

    const lowerSearch = searchTerm.toLowerCase();
    return availableModels.filter(
      (model) =>
        model.name.toLowerCase().includes(lowerSearch) ||
        model.id.toLowerCase().includes(lowerSearch)
    );
  }, [availableModels, searchTerm]);

  const handleSave = async () => {
    // Validate that all 4 council models are selected
    if (councilModels.some((model) => !model)) {
      toast.error('Please select all 4 council models');
      return;
    }

    if (!chairmanModel) {
      toast.error('Please select a chairman model');
      return;
    }

    try {
      setLoading(true);
      await api.updateSettings(councilModels, chairmanModel);
      toast.success('Settings saved successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
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
            Configure the default models for new conversations. Select 4 council models and 1 chairman model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Search Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Models</label>
            <Input
              type="text"
              placeholder="Filter by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loadingModels}
              className="w-full"
            />
            {searchTerm && (
              <p className="text-xs text-gray-500">
                Found {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Council Models */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Council Models (4 required)</h3>
            <p className="text-xs text-gray-500">
              These models will deliberate on each question in Stage 1 and evaluate responses in Stage 2.
            </p>
            {councilModels.map((modelId, index) => (
              <div key={index} className="space-y-2">
                <label className="text-sm text-gray-700">
                  Council Model {index + 1}
                </label>
                <Select
                  value={modelId}
                  onValueChange={(value) => updateCouncilModel(index, value)}
                  disabled={loadingModels}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingModels ? 'Loading models...' : 'Select a model'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredModels.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No models found
                      </div>
                    ) : (
                      filteredModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Chairman Model */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Chairman Model</h3>
            <p className="text-xs text-gray-500">
              This model will synthesize the final response in Stage 3 based on all council deliberations.
            </p>
            <Select
              value={chairmanModel}
              onValueChange={setChairmanModel}
              disabled={loadingModels}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingModels ? 'Loading models...' : 'Select a model'} />
              </SelectTrigger>
              <SelectContent>
                {filteredModels.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    No models found
                  </div>
                ) : (
                  filteredModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
