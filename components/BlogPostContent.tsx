'use client'

import 'katex/dist/katex.min.css'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import Giscus from '@giscus/react'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { format } from 'date-fns'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface BlogPostContentProps {
  title: string
  date: string
  content: string
  headerContent?: React.ReactNode
}

export function BlogPostContent({ title, date, content, headerContent }: BlogPostContentProps) {
  return (
    <Card className='max-w-3xl mx-auto mt-8 font-mono'>
      <CardHeader className='flex justify-between items-start'>
        <div>
          <CardTitle className='text-3xl font-bold'>{title}</CardTitle>
          <time className='text-xs text-gray-400' data-status-datetime=''>
            {format(new Date(date), 'MMMM d, yyyy')}
          </time>
        </div>
        {headerContent}
      </CardHeader>
      <CardContent>
        <div className='prose max-w-none dark:prose-invert'>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({
                inline,
                className,
                children,
                ...props
              }: {
                inline?: boolean
                className?: string
                children?: React.ReactNode
              } & React.HTMLAttributes<HTMLElement>) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow as { [key: string]: React.CSSProperties }}
                    language={match[1]}
                    PreTag='div'
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              },
              a: ({ children, ...props }) => (
                <a
                  {...props}
                  className='text-gray-400 no-underline hover:text-gray-600 hover:underline hover:underline-offset-4 transition-colors duration-200 break-words'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className='pl-4 border-l-4 border-gray-200 text-gray-400'>
                  {children}
                </blockquote>
              ),
              img: ({ children, ...props }) => (
                <figure className='flex justify-center'>
                  <img
                    {...props}
                    alt='image'
                    className='h-auto rounded-lg max-w-[min(100%,32em)]'
                  />
                  {children && <figcaption>{children}</figcaption>}
                </figure>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </CardContent>
      <Giscus
        repo='metrue/discussions'
        repoId='R_kgDOHH4v0Q'
        category='Announcements'
        categoryId='DIC_kwDOHH4v0c4CObFA'
        mapping='pathname'
        strict='0'
        reactionsEnabled='0'
        emitMetadata='0'
        inputPosition='bottom'
        theme='light'
        lang='en'
        loading='lazy'
      />
    </Card>
  )
}
