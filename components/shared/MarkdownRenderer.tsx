"use client";

import React, { HTMLAttributes, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { transformGithubImageUrl } from "@/lib/urlUtils";
import "katex/dist/katex.min.css";

interface CodeProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Memoized plugin arrays - created once, never recreated
const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];

// Memoized syntax highlighter style
const syntaxStyle = tomorrow as { [key: string]: React.CSSProperties };

// Shared markdown components - memoized to prevent recreation on every render
const markdownComponents = {
  code: ({ inline, className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <SyntaxHighlighter
        style={syntaxStyle}
        language={match[1]}
        PreTag="div"
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  a: ({ children, ...props }: { children?: React.ReactNode; href?: string }) => (
    <a
      {...props}
      className="text-gray-400 no-underline hover:text-gray-600 hover:underline hover:underline-offset-4 transition-colors duration-200 break-words"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <div className="pl-4 border-l-4 border-gray-200 text-gray-400">
      {children}
    </div>
  ),
  img: (props: { src?: string; alt?: string }) => {
    const transformedSrc = transformGithubImageUrl(props.src);
    return (
      <img
        {...props}
        src={transformedSrc}
        alt={props.alt || "image"}
      />
    );
  },
};

/**
 * Shared memoized Markdown renderer component.
 * Uses ReactMarkdown with GFM, math, and syntax highlighting support.
 * Memoized to prevent unnecessary re-renders.
 */
function MarkdownRendererComponent({ content, className }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={markdownComponents}
      className={className}
    >
      {content}
    </ReactMarkdown>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererComponent);
