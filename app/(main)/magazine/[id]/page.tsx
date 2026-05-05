'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, BookOpen } from 'lucide-react';
import { getMagazineArticleById } from '@/lib/supabase/queries';
import type { MagazineArticle } from '@/lib/types';

type ArticleWithContent = MagazineArticle & { content: string };

function renderContent(content: string) {
  return content.split('\n\n').map((block, i) => {
    if (block.startsWith('**') && block.endsWith('**')) {
      return (
        <h2 key={i} className="text-lg font-bold text-[var(--text-main)] mt-6 mb-2">
          {block.slice(2, -2)}
        </h2>
      );
    }
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-[var(--text-sub)] leading-relaxed">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="text-[var(--text-main)] font-semibold">{part.slice(2, -2)}</strong>
            : part
        )}
      </p>
    );
  });
}

export default function MagazineArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<ArticleWithContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMagazineArticleById(id).then((data) => {
      setArticle(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">読み込み中...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--muted)]">記事が見つかりません</p>
        <button
          onClick={() => router.push('/home')}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold"
        >
          ホームへ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-12">
      {/* Hero */}
      <div className="relative h-64">
        {article.image_url && (
          <Image src={article.image_url} alt={article.title} fill className="object-cover" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-4 p-2 bg-white/20 backdrop-blur-sm rounded-full"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="absolute bottom-4 left-5 right-5">
          <span className="px-2.5 py-1 bg-white/90 rounded-full text-xs font-medium text-[var(--text-main)]">
            {article.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-4 relative z-10">
        <div className="bg-white rounded-t-3xl pt-6">
          <div className="flex items-center gap-4 mb-4 text-sm text-[var(--text-sub)]">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {article.read_time}分で読める
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              マガジン
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[var(--text-main)] mb-3 text-pretty">
            {article.title}
          </h1>

          <p className="text-[var(--text-sub)] text-sm leading-relaxed mb-6 pb-6 border-b border-[var(--border)]">
            {article.excerpt}
          </p>

          <div className="space-y-4 pb-12">
            {renderContent(article.content)}
          </div>
        </div>
      </div>
    </div>
  );
}
