"use client";

import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROMPT_TEMPLATES,
  validatePromptTemplate,
} from "@/lib/prompt-templates";

interface PromptEditorProps {
  stage: "stage1" | "stage2" | "stage3" | "preprocessing";
  value: string;
  onChange: (value: string) => void;
  onRestoreDefault: () => void;
}

export default function PromptEditor({
  stage,
  value,
  onChange,
  onRestoreDefault,
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedVariable, setSelectedVariable] = useState<string>("");

  const template = PROMPT_TEMPLATES[stage];
  const validation = validatePromptTemplate(value, template.requiredVariables);

  const handleInsertVariable = (variable: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const placeholder = `{${variable}}`;

    const newValue =
      value.substring(0, start) + placeholder + value.substring(end);

    onChange(newValue);

    // Reset selection and focus
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + placeholder.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    setSelectedVariable("");
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-medium text-neutral-200">
            {template.name}
          </h4>
          <p className="text-xs text-neutral-500 mt-1">
            {template.description}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRestoreDefault}
          className="text-xs"
        >
          Restore Default
        </Button>
      </div>

      {/* Variable Inserter */}
      <div className="flex items-center gap-2">
        <Select value={selectedVariable} onValueChange={handleInsertVariable}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Insert variable..." />
          </SelectTrigger>
          <SelectContent>
            {template.availableVariables.map((variable) => (
              <SelectItem key={variable} value={variable} className="text-xs">
                {`{${variable}}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-neutral-500">
          Click to insert at cursor position
        </span>
      </div>

      {/* Validation Errors */}
      {!validation.valid && (
        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
          <p className="text-xs text-red-400 font-medium mb-1">
            ⚠️ Missing required variables:
          </p>
          <ul className="text-xs text-red-300 space-y-0.5">
            {validation.missingVariables.map((variable) => (
              <li key={variable}>
                • <code className="text-xs bg-red-900/30 px-1 py-0.5 rounded">{`{${variable}}`}</code>
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-300 mt-2">
            These variables must be included in your prompt for it to work
            correctly.
          </p>
        </div>
      )}

      {/* Prompt Editor */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        className="font-mono text-xs resize-y min-h-[200px] max-h-[500px]"
        placeholder={template.template}
      />

      {/* Available Variables Reference */}
      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
        <p className="text-xs font-medium text-neutral-300 mb-2">
          Available Variables:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {template.availableVariables.map((variable) => {
            const isRequired = template.requiredVariables.includes(variable);
            return (
              <div
                key={variable}
                className="flex items-center gap-2 text-xs text-neutral-400"
              >
                <code className="text-xs bg-neutral-800 px-1.5 py-0.5 rounded text-primary">
                  {`{${variable}}`}
                </code>
                {isRequired && (
                  <span className="text-red-400 text-xs">*required</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Variables marked with * are required and must be included in your
          prompt.
        </p>
      </div>

      {/* Character Count */}
      <div className="flex justify-between items-center text-xs text-neutral-500">
        <span>{value.length} characters</span>
        {validation.valid ? (
          <span className="text-green-400">✓ Valid prompt</span>
        ) : (
          <span className="text-red-400">⚠ Invalid prompt</span>
        )}
      </div>
    </div>
  );
}
