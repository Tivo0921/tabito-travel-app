import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, Clock, Package as PackageIcon } from 'lucide-react';
import type { Package } from '@/lib/types';

interface PackageCardProps {
  package: Package;
  variant?: 'default' | 'compact';
}

export function PackageCard({ package: pkg, variant = 'default' }: PackageCardProps) {
  if (variant === 'compact') {
    return (
      <Link href={`/package/${pkg.id}`} className="block group">
        <div className="flex gap-4 p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
            {pkg.image_url ? (
              <Image
                src={pkg.image_url}
                alt={pkg.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PackageIcon className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 py-1">
            <h3 className="font-semibold text-[var(--text-main)] text-sm line-clamp-2 mb-1">
              {pkg.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-[var(--text-sub)] mb-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {pkg.area}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {pkg.duration}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[var(--primary)] text-[var(--primary)]" />
                <span className="text-xs font-medium">{pkg.rating}</span>
                <span className="text-xs text-[var(--muted)]">({pkg.review_count})</span>
              </div>
              <span className="text-sm font-bold text-[var(--primary)]">
                {pkg.price.toLocaleString()}円
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/package/${pkg.id}`} className="block group">
      <div className="bg-white rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {pkg.image_url ? (
            <Image
              src={pkg.image_url}
              alt={pkg.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PackageIcon className="w-16 h-16 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 mb-2">
              {pkg.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-[var(--text-main)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-[var(--text-main)] text-lg mb-2 line-clamp-2 text-pretty">
            {pkg.title}
          </h3>
          <p className="text-sm text-[var(--text-sub)] mb-3 line-clamp-2">
            {pkg.short_description}
          </p>
          <div className="flex items-center gap-3 text-sm text-[var(--text-sub)] mb-3">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {pkg.area}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {pkg.duration}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-[var(--primary)] text-[var(--primary)]" />
              <span className="font-semibold">{pkg.rating}</span>
              <span className="text-[var(--muted)]">({pkg.review_count})</span>
            </div>
            <span className="text-lg font-bold text-[var(--primary)]">
              {pkg.price.toLocaleString()}円
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
