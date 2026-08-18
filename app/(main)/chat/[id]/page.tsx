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
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatThread, ChatMessage } from '@/lib/types';

/**
 * id で重複排除して時刻順に並べ直す。
 * 初回フェッチとRealtime購読は同時に走るため、置き換えにすると
 * 「購読が先に入れた新着を、後から解決した古いスナップショットが消す」
 * という取りこぼしが起きる。必ずマージする。
 */
function mergeMessages(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of [...a, ...b]) byId.set(m.id, m);
  // 文字列比較は使えない。同じ時刻でも取得経路で表記が違うため:
  //   PostgREST → '2026-08-18T11:45:20+00:00'（区切りが T）
  //   Realtime  → '2026-08-18 11:45:20+00'   （区切りが半角スペース）
  // スペース(0x20) < 'T'(0x54) なので、後から届いた新着が先頭に並んでしまう。
  return [...byId.values()].sort(
    (x, y) => Date.parse(x.created_at) - Date.parse(y.created_at),
  );
}

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
  // 購読が張れていない状態を黙って放置しない。
  // anon で購読されて配信が止まった不具合は「ただ更新されない」形でしか出ず、
  // 検知手段が無かった。
  const [realtimeDown, setRealtimeDown] = useState(false);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));

    Promise.all([getChatThreadById(id), getChatMessages(id)])
      .then(([th, msgs]) => {
        setThread(th);
        // 置き換えず、購読が先に入れた分を残す
        setMessages((prev) => mergeMessages(prev, msgs));
        if (th) markChatThreadRead(id);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 相手の新着をリアルタイムで受け取る。
  // 購読は「セッションを Realtime クライアントに載せてから」開始する。
  // 先に subscribe すると anon として接続され、chat_messages の
  // RLS（参加者のみ）を通過できず INSERT が一切配信されない。
  // セッション復元と購読の競合になるため、間に合った時だけ動く不安定な状態になる。
  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`chat:${id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${id}` },
          (payload) => {
            const incoming = payload.new as ChatMessage;
            // 自分の送信は楽観更新で既に入っているので mergeMessages が吸収する
            setMessages((prev) => mergeMessages(prev, [incoming]));
            markChatThreadRead(id);
          },
        )
        .subscribe((status) => {
          // SUBSCRIBED 以外は配信が来ない。復帰したら消す。
          setRealtimeDown(status !== 'SUBSCRIBED');
        });
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
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
    setMessages((prev) => mergeMessages(prev, [sent]));
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
    // 親レイアウト((main)/layout.tsx)の pb-28 / lg:pb-12 を打ち消す。
    // 残したままだと入力欄の下に空白の帯ができ、sticky の入力バーが浮いて見える。
    // 高さも min-h-screen だと 100vh + 親padding になり必ずスクロールが出るため使わない。
    <div className="flex flex-col h-[100dvh] pt-[env(safe-area-inset-top)] -mb-28 lg:-mb-12 lg:max-w-3xl">
      <header className="px-5 pt-6 pb-4 border-b border-[var(--border)] lg:pt-10">
        <button
          onClick={() => router.push('/chat')}
          className="flex items-center gap-1 text-[var(--primary)]"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t('chat.title')}</span>
        </button>
      </header>

      {/* min-h-0 が無いと flex アイテムが縮まず overflow が効かない。
          高さを h-[100dvh] で固定しているので、ここでスクロールさせる。 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
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

      {realtimeDown && (
        <p className="px-5 pb-2 text-sm text-[var(--text-sub)]">{t('chat.realtimeDown')}</p>
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
