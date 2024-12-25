'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BlogPostContent } from '@/components/BlogPostContent'
import type { BlogPost } from '@/lib/githubApi'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { AiOutlineEllipsis } from 'react-icons/ai'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/use-toast'

function removeFrontmatter(content: string): string {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/
  return content.replace(frontmatterRegex, '')
}

function decodeContent(content: string): string {
  try {
    return decodeURIComponent(content)
  } catch (error) {
    console.error('Error decoding content:', error)
    return content
  }
}

export const PostContainer = ({ post }: { post: BlogPost }) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  // eslint-disable-next-line
  const { data: session, status } = useSession()

  const t = useTranslations('HomePage')

  const decodedTitle = decodeContent(post.title)
  const decodedContent = decodeContent(post.content)
  const contentWithoutFrontmatter = removeFrontmatter(decodedContent)

  const handleDeleteBlogPost = async () => {
    if (!session?.accessToken) {
      console.error('No access token available')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteBlogPost',
          id: post.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete blog post')
      }

      toast({
        title: t('success'),
        description: t('blogPostDeleted'),
        duration: 3000,
      })

      setTimeout(() => {
        router.push('/blog')
      }, 500)
    } catch (error) {
      console.error('Error deleting blog post:', error)
      toast({
        title: t('error'),
        description: t('blogPostDeleteFailed'),
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const headerContent = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <AiOutlineEllipsis className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onSelect={() => router.push(`/editor?type=blog&id=${post.id}`)}>
            {t('edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)}>
            {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete')}</DialogTitle>
            <DialogDescription>{t('undoAction')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsDeleteDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant='destructive' onClick={handleDeleteBlogPost} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  return (
    <BlogPostContent
      title={decodedTitle}
      date={post.date}
      content={contentWithoutFrontmatter}
      headerContent={status === 'authenticated' ? headerContent : null}
    />
  )
}
