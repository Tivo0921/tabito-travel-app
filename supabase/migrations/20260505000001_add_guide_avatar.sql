-- ガイドのアバター画像URLを追加
ALTER TABLE guides ADD COLUMN IF NOT EXISTS avatar_url text;

-- シードデータのガイドにアバターを設定
UPDATE guides
SET avatar_url = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop'
WHERE id = '00000000-0000-0000-0001-000000000001';

UPDATE guides
SET avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop'
WHERE id = '00000000-0000-0000-0001-000000000002';

UPDATE guides
SET avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop'
WHERE id = '00000000-0000-0000-0001-000000000003';
