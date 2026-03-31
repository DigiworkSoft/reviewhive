import { redirect } from 'next/navigation';

export default function ReviewRedirect({ searchParams }: { searchParams: { src?: string } }) {
  const src = searchParams.src;
  redirect(src ? `/?src=${encodeURIComponent(src)}` : '/');
}
