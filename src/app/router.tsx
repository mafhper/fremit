import { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProductLayout } from '@/components/layout/ProductLayout';
import { AboutPage, EditorPage, HomePage } from '@/app/lazyPages';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <ProductLayout />,
      children: [
        {
          index: true,
          element: <Suspense fallback={<div className="min-h-[40vh]" />}><HomePage /></Suspense>,
        },
        {
          path: 'about',
          element: <Suspense fallback={<div className="min-h-[40vh]" />}><AboutPage /></Suspense>,
        },
      ],
    },
    {
      path: '/editor',
      element: <Suspense fallback={<div className="min-h-[40vh]" />}><EditorPage /></Suspense>,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);
