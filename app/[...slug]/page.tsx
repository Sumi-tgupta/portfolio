import type { Metadata } from 'next';
import ForbiddenPage from '@/components/ForbiddenPage';

export const metadata: Metadata = {
  title: '403 Forbidden | Sumit Gupta',
};

export default function ForbiddenRoute() {
  return <ForbiddenPage />;
}
