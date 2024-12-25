import { getBlogPostsPublic } from '@/lib/githubApi'
import { Octokit } from '@octokit/rest'
import { PostContainer } from './component'

export default async function Page({ params }: { params: { id: string } }) {
  const octokit = new Octokit()
  const posts = await getBlogPostsPublic(octokit, 'metrue', 'tinymind-blog')
  const post = posts.find((p) => p.id === decodeURIComponent(params.id))

  if (!post) {
    return <div>Post not found</div>
  }

  return <PostContainer post={post} />
}
