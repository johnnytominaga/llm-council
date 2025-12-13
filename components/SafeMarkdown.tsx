/**
 * Safe ReactMarkdown wrapper that handles edge cases like empty image src
 */

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface SafeMarkdownProps {
  children: string | undefined | null;
  className?: string;
}

export default function SafeMarkdown({ children, className }: SafeMarkdownProps) {
  // Handle undefined or null children
  if (!children) {
    return null;
  }
  const components: Components = {
    // Handle images with invalid src gracefully
    img: ({ node, ...props }) => {
      // Skip images with empty, local, or invalid URLs
      if (!props.src || typeof props.src !== 'string') {
        return null;
      }

      const src = props.src.trim();
      if (src === '' ||
          src.startsWith('/mnt/') ||
          src.startsWith('file://') ||
          (!src.startsWith('http') && !src.startsWith('data:'))) {
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
