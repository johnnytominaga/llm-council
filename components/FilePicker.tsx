'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { Attachment } from '@/types/conversation';

interface FilePickerProps {
  onFilesSelected: (files: Attachment[]) => void;
  maxFiles?: number;
  attachments?: Attachment[]; // Optional: parent can control attachments state
}

export default function FilePicker({ onFilesSelected, maxFiles = 5, attachments }: FilePickerProps) {
  const [localFiles, setLocalFiles] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use attachments prop if provided, otherwise use local state
  const selectedFiles = attachments !== undefined ? attachments : localFiles;

  // Sync local state with parent when attachments prop changes
  useEffect(() => {
    if (attachments !== undefined) {
      setLocalFiles(attachments);
    }
  }, [attachments]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if adding these files would exceed maxFiles
    if (selectedFiles.length + files.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files at a time`);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const uploadedFiles: Attachment[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();
        uploadedFiles.push(result.file);
      }

      const newFiles = [...selectedFiles, ...uploadedFiles];
      setLocalFiles(newFiles);
      onFilesSelected(newFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again if removed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = async (index: number) => {
    const fileToRemove = selectedFiles[index];

    // Optimistically update UI (remove from state first)
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setLocalFiles(newFiles);
    onFilesSelected(newFiles);

    // Try to delete from S3 in background
    try {
      await api.deleteUploadedFile(fileToRemove.key);
    } catch (err) {
      // Log error but don't revert UI change
      // The file is already removed from the UI, and S3 cleanup failure is not critical
      console.error('Failed to delete file from S3:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      );
    }
    if (contentType === 'application/pdf') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-neutral-900 rounded-xl ring-1 ring-neutral-800"
            >
              <div className="text-neutral-400">
                {getFileIcon(file.contentType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-100 truncate">
                  {file.filename}
                </div>
                <div className="text-xs text-neutral-500">
                  {formatFileSize(file.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="p-1 text-neutral-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                title="Remove file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length < maxFiles && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-neutral-700 border-t-primary rounded-full animate-spin mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Attach Files
              </>
            )}
          </Button>
        </div>
      )}

      {/* File info */}
      <div className="text-xs text-neutral-500">
        Supported: Images (PNG, JPEG, WebP, GIF) up to 10MB, PDFs up to 50MB
      </div>
    </div>
  );
}
