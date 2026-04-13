-- Run this in Supabase Dashboard → SQL Editor (one-time setup).
-- Creates public.outputs for saving generated content per user.

CREATE TABLE public.outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  output_type TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  conversation_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outputs" ON public.outputs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outputs" ON public.outputs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outputs" ON public.outputs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own outputs" ON public.outputs
  FOR DELETE USING (auth.uid() = user_id);
