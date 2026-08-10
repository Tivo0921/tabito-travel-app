'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getChatThreadById,
  getChatMessages,
  sendChatMessage,
  markChatThreadRead,
} from '@/lib/supabase/queries';
import { useT } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import type { ChatThread, ChatMessage } from '@/lib/types';

export default function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useT();

  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));

    Promise.all([getChatThreadById(id), getChatMessages(id)])
      .then(([th, msgs]) => {
        setThread(th);
        setMessages(msgs);
        if (th) markChatThreadRead(id);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 相手の新着をリアルタイムで受け取る。配信対象にもRLSが効くので他人の分は届かない。
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${id}` },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages((prev) =>
            // 自分の送信は楽観更新で既に入っているので重複させない
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
          markChatThreadRead(id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(false);
    const sent = await sendChatMessage(id, body);
    setSending(false);

    if (!sent) {
      setError(true);
      return;
    }
    setDraft('');
    setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">{t('common.loading')}</p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--muted)]">{t('chat.threadNotFound')}</p>
        <button
          onClick={() => router.push('/chat')}
          className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold hover:bg-[var(--primary)]/90 transition-colors"
        >
          {t('chat.title')}
        </button>
      </div>
    );
  }

  const canPost = thread.status === 'open';

  return (
    <div className="flex flex-col min-h-screen pt-[env(safe-area-inset-top)] lg:max-w-3xl">
      <header className="px-5 pt-6 pb-4 border-b border-[var(--border)] lg:pt-10">
        <button
          onClick={() => router.push('/chat')}
          className="flex items-center gap-1 text-[var(--primary)]"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t('chat.title')}</span>
        </button>
      </header>

      <div className="flex-1 px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-[var(--muted)] py-12">{t('chat.noMessages')}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words',
                  mine
                    ? 'bg-[var(--primary)] text-white rounded-br-md'
                    : 'bg-white text-[var(--text-main)] shadow-sm rounded-bl-md'
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-5 pb-2 text-sm text-red-600">{t('chat.loadFailed')}</p>
      )}

      {/* 入力欄: 詳細ページでは BottomNav が消えるので、その分の余白は取らない */}
      {canPost ? (
        <div className="sticky bottom-0 bg-white border-t border-[var(--border)] px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // PCでは Enter 送信、Shift+Enter で改行。IME変換中は送信しない
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={t('chat.inputPlaceholder')}
              className="flex-1 resize-none max-h-32 px-4 py-2.5 bg-gray-50 border border-[var(--border)] rounded-2xl text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              aria-label={t('chat.send')}
              className="flex-shrink-0 p-2.5 bg-[var(--primary)] rounded-full text-white disabled:opacity-40 hover:bg-[var(--primary)]/90 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <p className="px-5 py-4 text-center text-sm text-[var(--muted)] border-t border-[var(--border)]">
          {t('chat.readOnly')}
        </p>
      )}
    </div>
  );
}
