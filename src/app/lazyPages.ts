import { lazy } from 'react';

export const HomePage = lazy(() => import('@/pages/HomePage').then((module) => ({ default: module.HomePage })));
export const AboutPage = lazy(() => import('@/pages/AboutPage').then((module) => ({ default: module.AboutPage })));
export const EditorPage = lazy(() => import('@/pages/EditorPage').then((module) => ({ default: module.EditorPage })));
