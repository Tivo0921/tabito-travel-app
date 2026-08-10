'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { getChatListItems, getOrCreateChatThread } from '@/lib/supabase/queries';
import { useT } from '@/lib/i18n/provider';
import type { ChatListItem } from '@/lib/types';

export default function ChatListPage() {
  const t = useT();
  const router = useRouter();
  const [threads, setThreads] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    getChatListItems()
      .then(setThreads)
      .finally(() => setLoading(false));
  }, []);

  /** 未会話の行はこの時点でスレッドを作ってから開く */
  const openThread = async (item: ChatListItem) => {
    if (item.thread_id) {
      router.push(`/chat/${item.thread_id}`);
      return;
    }
    setOpening(item.package_id);
    const thread = await getOrCreateChatThread(item.package_id);
    setOpening(null);
    if (thread) router.push(`/chat/${thread.id}`);
  };

  return (
    <div className="pt-[env(safe-area-inset-top)] lg:max-w-3xl">
      <header className="px-5 pt-6 pb-4 lg:pt-10">
        <h1 className="text-2xl font-bold text-[var(--text-main)] lg:text-3xl">
          {t('chat.title')}
        </h1>
      </header>

      {loading ? (
        <p className="px-5 py-12 text-center text-[var(--muted)]">{t('common.loading')}</p>
      ) : threads.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <MessageCircle className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
          <p className="text-[var(--text-main)] font-semibold mb-1">{t('chat.empty.title')}</p>
          <p className="text-sm text-[var(--text-sub)]">{t('chat.empty.desc')}</p>
        </div>
      ) : (
        <ul className="px-5 pb-8 space-y-2">
          {threads.map((thread) => (
            <li key={thread.package_id}>
              <button
                onClick={() => openThread(thread)}
                disabled={opening === thread.package_id}
                className="w-full text-left flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow disabled:opacity-60"
              >
                <Avatar
                  src={thread.partner_avatar_url}
                  name={thread.partner_name}
                  className="w-12 h-12"
                />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-main)] text-sm truncate">
                    {thread.partner_name}
                  </p>
                  {/* パッケージ名はDB由来なので投稿された言語のまま */}
                  <p className="text-xs text-[var(--muted)] truncate">
                    {t('chat.aboutPackage', { title: thread.package_title })}
                  </p>
                  <p className="text-sm text-[var(--text-sub)] truncate mt-0.5">
                    {thread.last_message_body ?? t('chat.startPrompt')}
                  </p>
                </div>

                {thread.unread_count > 0 && (
                  <span className="flex-shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-[var(--primary)] text-white text-xs font-bold">
                    {thread.unread_count}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
