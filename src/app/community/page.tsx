
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/hooks/use-user'

interface Topic {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  _count: { posts: number }
}

interface Post {
  id: string
  title: string
  content: string
  views: number
  createdAt: string
  author: {
    name: string
    avatar: string
    badges: { badge: { name: string, color: string, icon: string } }[]
  }
  topic: Topic
  isPinned: boolean
}

export default function CommunityPage() {
  const { user } = useUser()
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  // Fetch Topics
  const { data: topics, isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: () => fetch('/api/community').then(res => res.json())
  })

  // Fetch Posts (mock filter logic for now, ideally API handles it)
  // We'll update the API to support ?topic=... later
  const { data: allPosts, isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['posts', 'recent'],
    queryFn: () => fetch('/api/community/recent').then(res => res.json()) // We need this endpoint
  })

  const filteredPosts = selectedTopic
    ? allPosts?.filter(p => p.topic.slug === selectedTopic)
    : allPosts

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Sidebar - Topics */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">forum</span>
                Community
              </h2>
              <div className="space-y-1">
                <Button
                  variant={selectedTopic === null ? 'secondary' : 'ghost'}
                  className="w-full justify-start font-bold"
                  onClick={() => setSelectedTopic(null)}
                >
                  <span className="material-symbols-outlined mr-2 text-lg">public</span>
                  Tutti i Thread
                </Button>

                {topicsLoading ? (
                  Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
                ) : (
                  topics?.map(topic => (
                    <Button
                      key={topic.id}
                      variant={selectedTopic === topic.slug ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSelectedTopic(topic.slug)}
                    >
                      <span className="material-symbols-outlined mr-2 text-lg">{topic.icon || 'tag'}</span>
                      <span className="truncate">{topic.name}</span>
                      <span className="ml-auto text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {topic._count.posts}
                      </span>
                    </Button>
                  ))
                )}
              </div>
            </Card>

            <Button className="w-full font-bold bg-primary hover:bg-primary-dark" size="lg">
              <span className="material-symbols-outlined mr-2">add</span>
              Nuovo Post
            </Button>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-3 space-y-14">
            {postsLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="p-4 bg-white/50 backdrop-blur-md border-white/20"><Skeleton className="h-24 w-full" /></Card>
              ))
            ) : filteredPosts?.length === 0 ? (
              <div className="text-center py-12 bg-white/50 backdrop-blur-md rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500">Nessuna discussione trovata.</p>
              </div>
            ) : (
              filteredPosts?.map(post => (
                <Link key={post.id} href={`/community/posts/${post.id}`} className="block group">
                  <Card className="p-0 border border-white/40 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden rounded-2xl">
                    <div className="flex">
                      {/* Vote Column (Static mainly) */}
                      <div className="w-12 bg-white/50 dark:bg-white/5 flex flex-col items-center pt-4 gap-1 border-r border-white/20 dark:border-white/5 backdrop-blur-sm">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-orange-100 hover:text-orange-500">
                          <span className="material-symbols-outlined text-xl">arrow_upward</span>
                        </Button>
                        <span className="text-sm font-bold font-mono">{(post.views / 10).toFixed(0)}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-blue-100 hover:text-blue-500">
                          <span className="material-symbols-outlined text-xl">arrow_downward</span>
                        </Button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          {post.topic && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 backdrop-blur-md border-0 text-[11px] h-6 px-2 font-medium flex items-center gap-1.5 transition-colors">
                              <span className="material-symbols-outlined text-[14px]">{post.topic.icon}</span>
                              {post.topic.name}
                            </Badge>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1 text-gray-400">
                            Posted by
                            <span className="font-bold text-gray-700 dark:text-gray-300 hover:underline flex items-center gap-1">
                              {post.author.name}
                              {/* Badges */}
                              {post.author.badges?.map((ub, idx) => (
                                <span key={idx} title={ub.badge.name} className="material-symbols-outlined text-[16px] drop-shadow-sm" style={{ color: ub.badge.color }}>
                                  {ub.badge.icon}
                                </span>
                              ))}
                            </span>
                          </span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: it })}</span>
                        </div>

                        <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors tracking-tight">
                          {post.isPinned && <span className="material-symbols-outlined text-green-500 align-middle mr-1 text-lg">push_pin</span>}
                          {post.title}
                        </h3>

                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4 leading-relaxed">
                          {post.content}
                        </p>

                        <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                          <div className="flex items-center gap-1.5 bg-gray-100/50 dark:bg-white/5 px-3 py-1.5 rounded-full transition-colors hover:bg-gray-200/50 dark:hover:bg-white/10">
                            <span className="material-symbols-outlined text-base">chat_bubble</span>
                            Commenti
                          </div>
                          <div className="flex items-center gap-1.5 bg-gray-100/50 dark:bg-white/5 px-3 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-base">visibility</span>
                            {post.views} Views
                          </div>
                          <div className="flex items-center gap-1.5 hover:bg-gray-100/50 dark:hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors ml-auto text-primary">
                            <span className="material-symbols-outlined text-base">share</span>
                            Condividi
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}
