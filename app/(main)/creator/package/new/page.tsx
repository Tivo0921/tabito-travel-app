'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import CreatorPackagePage from '../[id]/page';

// /creator/package/new?guide=xxx → [id]=new として同じページを使う
function NewPackageInner() {
  return <CreatorPackagePage params={Promise.resolve({ id: 'new' })} />;
}

export default function NewPackagePage() {
  return (
    <Suspense>
      <NewPackageInner />
    </Suspense>
  );
}
