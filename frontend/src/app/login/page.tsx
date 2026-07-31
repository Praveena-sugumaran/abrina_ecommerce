import Login from '@/app/pages/Login';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Welcome Back',
  description: 'Sign in to your account to access your orders, wishlist, and personalized experience.',
};

export default function Page() { return <Login />; }