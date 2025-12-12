/**
 * Safe ReactMarkdown wrapper that handles edge cases like empty image src
 */

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface SafeMarkdownProps {
  children: string;
  className?: string;
}

export default function SafeMarkdown({ children, className }: SafeMarkdownProps) {
  const components: Components = {
    // Handle images with invalid src gracefully
    img: ({ node, ...props }) => {
      // Skip images with empty, local, or invalid URLs
      if (!props.src ||
          props.src.trim() === '' ||
          props.src.startsWith('/mnt/') ||
          props.src.startsWith('file://') ||
          (!props.src.startsWith('http') && !props.src.startsWith('data:'))) {
        return null;
      }
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      return <img {...props} />;
    },
  };

  // Wrap in div with className if provided
  if (className) {
    return (
      <div className={className}>
        <ReactMarkdown components={components}>
          {children}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <ReactMarkdown components={components}>
      {children}
    </ReactMarkdown>
  );
}
