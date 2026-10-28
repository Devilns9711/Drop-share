import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DropShare — Share the original',
  description: 'Share photos and videos in their original quality with one simple link.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
