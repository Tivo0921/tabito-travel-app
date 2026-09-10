import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PlaceCandidate } from '@/lib/types';

/**
 * Google Places (New) Text Search の中継。
 *
 * GOOGLE_MAPS_API_KEY はサーバー専用なので、ブラウザから直接叩けない。
 * ここが唯一の入口になる。
 *
 * stg は誰でも開けるため、無認証で公開すると URL を知った第三者に
 * こちらの課金で Places を回される。ログイン必須に加えて
 * 「クリエイター登録済み」まで絞る（購入者が使う機能ではない）。
 */

/** 短すぎる語は候補が絞れずコストだけかかる。2文字未満は呼ばない */
const MIN_QUERY_LENGTH = 2;
/** 送りすぎを防ぐ上限。UI 側でも入力長は抑えるが、境界はサーバーで決める */
const MAX_QUERY_LENGTH = 100;
/** UI に出すのは5件で足りる。増やすほど課金対象のフィールドが増える */
const MAX_RESULTS = 5;

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

/**
 * 課金は要求したフィールドで変わる。表示と経路計算に要るものだけに絞る。
 * id / displayName / formattedAddress / location 以外を足さないこと。
 */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
].join(',');

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // クリエイター登録済みかを確認する。guides.user_id は UNIQUE (#12)
  const { data: guide, error: guideError } = await supabase
    .from('guides')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (guideError) {
    console.error('places/search guide lookup failed:', guideError.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  if (!guide) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let query: unknown;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const trimmed = typeof query === 'string' ? query.trim() : '';
  // 空文字・短すぎ・長すぎは Google に投げない。課金と無駄な往復を避ける
  if (trimmed.length < MIN_QUERY_LENGTH || trimmed.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // キーが無い環境（PRのプレビュー等）でも編集画面ごと落とさない。
    // 呼び出し側は unavailable を見て「地点検索は使えません」と出す
    console.error('places/search: GOOGLE_MAPS_API_KEY is not set');
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  let res: Response;
  try {
    res = await fetch(PLACES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: trimmed,
        maxResultCount: MAX_RESULTS,
        languageCode: 'ja',
      }),
    });
  } catch (e) {
    // ネットワーク断。編集画面は生かしたまま検索だけ失敗させる
    console.error('places/search fetch failed:', e);
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }

  if (!res.ok) {
    // Google 側のエラー本文はキーやクォータの情報を含みうるので、
    // 呼び出し側には返さずログにだけ残す
    console.error('places/search upstream status:', res.status, await res.text().catch(() => ''));
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }

  const body = (await res.json().catch(() => null)) as { places?: GooglePlace[] } | null;

  const results: PlaceCandidate[] = (body?.places ?? [])
    .map((p): PlaceCandidate | null => {
      const lat = p.location?.latitude;
      const lng = p.location?.longitude;
      // 4点そろわないものは DB の CHECK に通らないので候補に出さない
      if (!p.id || !p.displayName?.text) return null;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;
      return {
        place_id: p.id,
        name: p.displayName.text,
        address: p.formattedAddress ?? '',
        latitude: lat,
        longitude: lng,
      };
    })
    .filter((p): p is PlaceCandidate => p !== null)
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ results });
}
