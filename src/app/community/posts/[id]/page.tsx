
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/hooks/use-user'
import { useToast } from '@/hooks/use-toast'

export default function PostPage() {
    const { id } = useParams()
    const { user } = useUser()
    const router = useRouter()
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [commentContent, setCommentContent] = useState('')

    // Fetch Post Details
    const { data: post, isLoading } = useQuery({
        queryKey: ['post', id],
        queryFn: () => fetch(`/api/community/posts/${id}`).then(res => res.json())
    })

    // Mutation for adding comment
    const commentMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch(`/api/community/posts/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            })
            if (!res.ok) throw new Error('Failed to post comment')
            return res.json()
        },
        onSuccess: () => {
            setCommentContent('')
            queryClient.invalidateQueries({ queryKey: ['post', id] })
            toast({ title: 'Commento pubblicato!' })
        }
    })

    const handleSubmitComment = () => {
        if (!commentContent.trim()) return
        commentMutation.mutate(commentContent)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark">
                <Header />
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-10 w-1/2 mb-4" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        )
    }

    if (!post) return <div>Post non trovato</div>

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white">
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                    <span className="material-symbols-outlined mr-1">arrow_back</span>
                    Torna alla Community
                </Button>

                {/* Main Post Card */}
                <Card className="p-6 mb-8 overflow-hidden relative border-[1px] border-primary/60 dark:border-primary/50">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex flex-col items-center">
                            <span className="material-symbols-outlined text-gray-400 hover:text-orange-500 text-2xl cursor-pointer">arrow_upward</span>
                            <span className="font-bold font-mono text-lg">{(post.views / 10).toFixed(0)}</span>
                            <span className="material-symbols-outlined text-gray-400 hover:text-blue-500 text-2xl cursor-pointer">arrow_downward</span>
                        </div>

                        <div className="w-full">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">{post.topic.icon}</span>
                                    {post.topic.name}
                                </Badge>
                                <span className="text-sm text-gray-500">• Posted by {post.author.name} {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: it })}</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold mb-4">{post.title}</h1>
                            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {post.content}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 border-t pt-4 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined">chat_bubble</span>
                            {post.comments.length} Commenti
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="material-symbols-outlined">share</span>
                            Condividi
                        </div>
                    </div>
                </Card>

                {/* Comment Section */}
                <div className="space-y-6">
                    {user ? (
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Textarea
                                    placeholder="Scrivi un commento..."
                                    className="min-h-[100px] mb-2"
                                    value={commentContent}
                                    onChange={(e) => setCommentContent(e.target.value)}
                                />
                                <div className="flex justify-end">
                                    <Button onClick={handleSubmitComment} disabled={commentMutation.isPending}>
                                        {commentMutation.isPending ? 'Invio...' : 'Pubblica Commento'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-lg text-center">
                            <Link href="/login" className="text-primary font-bold hover:underline">Accedi</Link> per commentare.
                        </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-4">
                        {post.comments.map((comment: any) => (
                            <Card key={comment.id} className="p-4 bg-gray-50 dark:bg-white/5 border-none">
                                <div className="flex gap-3">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={comment.author.avatar} />
                                        <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm flex items-center gap-1">
                                                {comment.author.name}
                                                {comment.author.badges?.map((ub: any, idx: number) => (
                                                    <span key={idx} title={ub.badge.name} className="material-symbols-outlined text-[12px]" style={{ color: ub.badge.color }}>
                                                        {ub.badge.icon}
                                                    </span>
                                                ))}
                                            </span>
                                            <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: it })}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

            </main>
            <Footer />
        </div>
    )
}
