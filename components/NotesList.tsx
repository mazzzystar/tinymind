'use client'

import 'katex/dist/katex.min.css'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEffect, useState } from 'react'

import { AiOutlineEllipsis } from 'react-icons/ai'
import { Button } from '@/components/ui/button'
import GitHubSignInButton from './GitHubSignInButton'
import { Note } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { createGitHubAPIClient } from '@/lib/client'
import { getRelativeTimeString } from '@/utils/dateFormatting'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/use-toast'
import { useTranslations } from 'next-intl'

interface NoteCardProps {
  thought: Note
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

export const NoteCard = ({ thought, onDelete, onEdit }: NoteCardProps) => {
  const t = useTranslations('HomePage')

  return (
    <div
      key={thought.id}
      className='relative flex flex-col justify-center p-4 rounded-lg leading-4 transition-all duration-300 ease-in-out hover:shadow-lg overflow-auto h-fit bg-white font-light	font-mono'
    >
      <div className='text-gray-800 mb-2 prose max-w-none'>
        <div>
          <small className='text-gray-500 self-end mt-2'>
            {getRelativeTimeString(thought.timestamp)}
          </small>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='text-gray-700 hover:text-black float-right bg-transparent'
              >
                <AiOutlineEllipsis className='h-5 w-5' />{' '}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => onDelete(thought.id)}>
                {t('delete')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(thought.id)}>{t('edit')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
              <div className='pl-4 border-l-4 border-gray-200 text-gray-400'>{children}</div>
            ),
          }}
        >
          {thought.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

interface NotesListProps {
  username: string
}

export default function NotesList({ username }: NotesListProps) {
  const [thoughts, setNotes] = useState<Note[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [thoughtToDelete, setNoteToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('HomePage')
  const { toast } = useToast()

  useEffect(() => {
    async function fetchNotes() {
      if (status === 'loading') return
      if (status === 'unauthenticated') {
        setIsLoading(false)
      }

      try {
        const fetchedNotes = await createGitHubAPIClient(session?.accessToken ?? '').getNotes(
          username,
          'tinymind-blog'
        )
        setNotes(fetchedNotes)
        setError(null)
      } catch (error) {
        console.error('Error fetching thoughts:', error)
        if (
          error instanceof Error &&
          (error.message.includes('Bad credentials') ||
            error.message.includes('Failed to get authenticated user'))
        ) {
          setError('authentication_failed')
        } else {
          setNotes([])
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotes()
  }, [session, status, username])

  const handleDeleteNote = async (id: string) => {
    if (!session?.accessToken) {
      console.error('No access token available')
      return
    }

    try {
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteNote',
          id: id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete thought')
      }

      setNotes(thoughts.filter((thought) => thought.id !== id))

      toast({
        title: t('success'),
        description: t('thoughtDeleted'),
        duration: 3000,
      })
    } catch (error) {
      console.error('Error deleting thought:', error)
      toast({
        title: t('error'),
        description: t('thoughtDeleteFailed'),
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setNoteToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleEdit = (id: string) => {
    router.push(`/editor?type=thought&id=${id}`)
  }

  const handleDelete = (id: string) => {
    setNoteToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  if (status === 'unauthenticated' || error === 'authentication_failed') {
    if (!username) {
      return <GitHubSignInButton />
    }
  }

  if (error && error !== 'authentication_failed') {
    return <div className='error-message'>{error}</div>
  }

  if (isLoading) {
    return (
      <div className='flex flex-col items-center mt-8 space-y-4'>
        <p className='text-gray-500'>{t('readingFromGithub')}</p>
      </div>
    )
  }

  if (thoughts.length === 0) {
    return (
      <div className='flex flex-col items-center mt-8 space-y-4'>
        <p className='text-gray-500'>{t('noNotesYet')}</p>
        <Button
          onClick={() => router.push('/editor?type=thought')}
          className='bg-black hover:bg-gray-800 text-white'
        >
          {t('createNote')}
        </Button>
      </div>
    )
  }

  return (
    <div className='max-w-2xl mx-auto p-4'>
      <div className='grid grid-cols-2 md:grid-cols-2 gap-2'>
        <div className='flex flex-col gap-2'>
          {thoughts
            .filter((_, index) => index % 2 !== 0)
            .map((thought) => (
              <NoteCard
                key={thought.id}
                thought={thought}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
        </div>
        <div className='flex flex-col gap-2'>
          {thoughts
            .filter((_, index) => index % 2 === 0)
            .map((thought) => (
              <NoteCard
                key={thought.id}
                thought={thought}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
        </div>
      </div>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete')}</DialogTitle>
            <DialogDescription>{t('undoAction')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline'>{t('cancel')}</Button>
            </DialogClose>
            <Button
              variant='destructive'
              onClick={() => {
                if (thoughtToDelete) {
                  handleDeleteNote(thoughtToDelete)
                }
                setIsDeleteDialogOpen(false)
              }}
            >
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
