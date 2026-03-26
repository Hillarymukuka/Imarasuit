'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PaperAirplaneIcon,
  CalendarIcon,
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  HashtagIcon,
  PhotoIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { usePostsStore, useCampaignsStore, useMarketingSettingsStore } from '@/modules/marketing/store';
import { marketingAIAPI, postsAPI } from '@/modules/marketing/api';
import type { Platform } from '@/modules/marketing/types';

const PLATFORMS: { key: Platform; label: string; color: string; activeColor: string; maxChars: number }[] = [
  { key: 'twitter', label: 'Twitter / X', color: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400', activeColor: 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400', maxChars: 280 },
  { key: 'instagram', label: 'Instagram', color: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400', activeColor: 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400', maxChars: 2200 },
  { key: 'linkedin', label: 'LinkedIn', color: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400', activeColor: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400', maxChars: 3000 },
  { key: 'facebook', label: 'Facebook', color: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400', activeColor: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400', maxChars: 63206 },
];

const TONES = [
  { key: 'professional', label: 'Professional' },
  { key: 'casual', label: 'Casual' },
  { key: 'humorous', label: 'Humorous' },
  { key: 'inspirational', label: 'Inspirational' },
  { key: 'urgent', label: 'Urgent / FOMO' },
  { key: 'educational', label: 'Educational' },
];

const AI_SUGGESTIONS = [
  'Write a promotional post for our new product launch',
  'Create an engaging question for our audience',
  'Share a behind-the-scenes look at our team',
  'Announce an upcoming event or webinar',
  'Share a customer success story',
  'Write a motivational Monday post',
  'Create a tip-of-the-day post for our industry',
];

export default function ComposerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const { createPost, updatePost, getPost } = usePostsStore();
  const { campaigns, fetchCampaigns } = useCampaignsStore();
  const { accounts, fetchAccounts } = useMarketingSettingsStore();

  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [tone, setTone] = useState('professional');
  const [saving, setSaving] = useState(false);
  const [campaignId, setCampaignId] = useState('');
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [mediaFiles, setMediaFiles]     = useState<{ file: File; preview: string }[]>([]);
  const [mediaUrls, setMediaUrls]       = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError]     = useState('');
  const mediaInputRef = React.useRef<HTMLInputElement>(null);

  const connectedPlatforms = new Set(accounts.filter(a => a.isConnected).map(a => a.platform));

  useEffect(() => {
    fetchCampaigns();
    fetchAccounts();
  }, [fetchCampaigns, fetchAccounts]);

  useEffect(() => {
    if (editId) {
      getPost(editId).then((post) => {
        setContent(post.content);
        setSelectedPlatforms(post.platforms);
        setCampaignId(post.campaignId || '');
        if (post.scheduledAt) {
          setScheduledAt(post.scheduledAt.slice(0, 16));
          setShowSchedule(true);
        }
        if (post.mediaUrls?.length) setMediaUrls(post.mediaUrls);
        setIsEdit(true);
      }).catch(() => {});
    }
  }, [editId, getPost]);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const minCharLimit = selectedPlatforms.length > 0
    ? Math.min(...selectedPlatforms.map((p) => PLATFORMS.find(pl => pl.key === p)?.maxChars || 99999))
    : 99999;
  const isOverLimit = content.length > minCharLimit;

  // ── AI Generate ──
  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiError('');
    try {
      const result = await marketingAIAPI.generate({
        prompt: aiPrompt,
        platforms: selectedPlatforms,
        tone,
        maxLength: minCharLimit < 99999 ? minCharLimit : undefined,
      });
      setContent(result.content);
    } catch (err: any) {
      setAiError(err.message || 'Generation failed');
    } finally {
      setAiGenerating(false);
    }
  }, [aiPrompt, selectedPlatforms, tone, minCharLimit]);

  // ── AI Rewrite ──
  const handleRewrite = async (instruction: string) => {
    if (!content.trim()) return;
    setRewriteLoading(true);
    setAiError('');
    try {
      const result = await marketingAIAPI.rewrite({
        content,
        instruction,
        platform: selectedPlatforms[0],
      });
      setContent(result.content);
    } catch (err: any) {
      setAiError(err.message || 'Rewrite failed');
    } finally {
      setRewriteLoading(false);
    }
  };

  // ── AI Hashtags ──
  const handleAddHashtags = async () => {
    if (!content.trim()) return;
    setHashtagLoading(true);
    try {
      const result = await marketingAIAPI.hashtags(content, 5);
      if (result.hashtags.length > 0) {
        setContent((prev) => prev.trimEnd() + '\n\n' + result.hashtags.join(' '));
      }
    } catch {
      // silent
    } finally {
      setHashtagLoading(false);
    }
  };

  // ── Upload pending local files → get public URLs ──
  const uploadPendingFiles = async (): Promise<string[]> => {
    if (mediaFiles.length === 0) return mediaUrls;
    setUploadingMedia(true);
    setMediaError('');
    const uploaded: string[] = [...mediaUrls];
    try {
      for (const { file } of mediaFiles) {
        const result = await postsAPI.uploadMedia(file);
        uploaded.push(result.url);
      }
      setMediaUrls(uploaded);
      setMediaFiles([]);
    } catch (err: any) {
      setMediaError(err.message || 'Media upload failed');
      throw err;
    } finally {
      setUploadingMedia(false);
    }
    return uploaded;
  };

  // ── Save / Publish ──
  const handleSaveDraft = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setSaving(true);
    try {
      const allMediaUrls = await uploadPendingFiles();
      if (isEdit && editId) {
        await updatePost(editId, { content, platforms: selectedPlatforms, scheduledAt: scheduledAt || undefined, campaignId: campaignId || undefined, status: 'draft', mediaUrls: allMediaUrls });
      } else {
        await createPost({ content, platforms: selectedPlatforms, status: 'draft', scheduledAt: scheduledAt || undefined, campaignId: campaignId || undefined, mediaUrls: allMediaUrls });
      }
      router.push('/marketing/schedule');
    } catch { alert('Failed to save draft'); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setSaving(true);
    try {
      const allMediaUrls = await uploadPendingFiles();
      if (isEdit && editId) {
        await updatePost(editId, {
          content, platforms: selectedPlatforms,
          ...(scheduledAt ? { scheduledAt, status: 'scheduled' } : { status: 'published' }),
          campaignId: campaignId || undefined,
          mediaUrls: allMediaUrls,
        });
      } else {
        await createPost({
          content, platforms: selectedPlatforms,
          ...(scheduledAt ? { scheduledAt, status: 'scheduled' } : { status: 'published' }),
          campaignId: campaignId || undefined,
          mediaUrls: allMediaUrls,
        });
      }
      router.push('/marketing');
    } catch { alert('Failed to publish'); }
    finally { setSaving(false); }
  };

  return (
    <ModuleGuard moduleId="marketing">
      <div className="min-h-screen">
        <Header title={isEdit ? 'Edit Post' : 'Composer'} subtitle="Create and schedule your social media posts" />

        <div className="p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ═══ Main Editor ═══ */}
            <div className="lg:col-span-2 space-y-4">
              {/* Platform Selection */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Platforms</h3>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const active = selectedPlatforms.includes(p.key);
                    const connected = connectedPlatforms.has(p.key);
                    return (
                      <button
                        key={p.key}
                        onClick={() => togglePlatform(p.key)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition ${active ? p.activeColor : p.color} hover:shadow-sm`}
                      >
                        {active && <CheckIcon className="w-3.5 h-3.5" />}
                        {p.label}
                        {connected && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      </button>
                    );
                  })}
                </div>
                {selectedPlatforms.some(p => !connectedPlatforms.has(p)) && connectedPlatforms.size > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Some selected platforms are not connected. Posts will be saved but not auto-published.{' '}
                    <a href="/marketing/settings" className="underline">Connect accounts →</a>
                  </p>
                )}
              </div>

              {/* Campaign Selector */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">Campaign (optional)</label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Content Editor */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Content</h3>
                  <span className={`text-xs font-medium ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
                    {content.length}{minCharLimit < 99999 ? ` / ${minCharLimit}` : ''}
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind? Write your post here or use the AI assistant to generate one..."
                  rows={10}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-800 dark:text-gray-200 p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-400"
                />

                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    onClick={handleAddHashtags}
                    disabled={hashtagLoading || !content.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
                  >
                    <HashtagIcon className="w-4 h-4" />
                    {hashtagLoading ? 'Adding...' : 'AI Hashtags'}
                  </button>
                  <button
                    onClick={() => handleRewrite('Make it shorter and punchier')}
                    disabled={rewriteLoading || !content.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    {rewriteLoading ? 'Rewriting...' : 'Shorten'}
                  </button>
                  <button
                    onClick={() => handleRewrite('Make it more engaging and add a call to action')}
                    disabled={rewriteLoading || !content.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    Enhance
                  </button>
                  <button
                    onClick={() => setShowSchedule(!showSchedule)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${showSchedule ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    <CalendarIcon className="w-4 h-4" /> Schedule
                  </button>
                  <button
                    onClick={() => setShowAI(!showAI)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition lg:hidden ${showAI ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    <SparklesIcon className="w-4 h-4" /> AI Assist
                  </button>
                </div>

                {/* ── Media picker ── */}
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Media <span className="font-normal text-gray-400">(optional · max 4 files · 10 MB each)</span>
                    </span>
                    {(mediaFiles.length + mediaUrls.length) < 4 && (
                      <button
                        type="button"
                        onClick={() => mediaInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
                        <PhotoIcon className="w-4 h-4" /> Add Media
                      </button>
                    )}
                    <input
                      ref={mediaInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const remaining = 4 - mediaFiles.length - mediaUrls.length;
                        const toAdd = files.slice(0, remaining).map((f) => ({
                          file: f,
                          preview: URL.createObjectURL(f),
                        }));
                        setMediaFiles((prev) => [...prev, ...toAdd]);
                        setMediaError('');
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {/* Thumbnails grid */}
                  {(mediaFiles.length > 0 || mediaUrls.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {/* Already-uploaded URLs (edit mode) */}
                      {mediaUrls.map((url, i) => (
                        <div key={url} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                          {url.match(/\.(mp4|webm|mov)$/i) ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <VideoCameraIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          ) : (
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          )}
                          <button
                            onClick={() => setMediaUrls((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            <XMarkIcon className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {/* Local previews (pending upload) */}
                      {mediaFiles.map((m, i) => (
                        <div key={m.preview} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-blue-300 dark:border-blue-600 bg-gray-100 dark:bg-gray-700">
                          {m.file.type.startsWith('video/') ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <VideoCameraIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          ) : (
                            <img src={m.preview} alt="" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-blue-600/70 text-white text-[9px] text-center py-0.5">Pending</div>
                          <button
                            onClick={() => {
                              URL.revokeObjectURL(m.preview);
                              setMediaFiles((prev) => prev.filter((_, idx) => idx !== i));
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            <XMarkIcon className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {mediaError && (
                    <p className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg">{mediaError}</p>
                  )}
                  {selectedPlatforms.includes('instagram') && mediaFiles.length === 0 && mediaUrls.length === 0 && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                      Instagram requires at least one image or video.
                    </p>
                  )}
                </div>

                {/* Schedule picker */}
                {showSchedule && (
                  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800/30">
                    <label className="text-xs font-medium text-orange-700 dark:text-orange-400 block mb-1">Schedule for</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full sm:w-auto rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-800 text-sm px-3 py-1.5 focus:ring-2 focus:ring-orange-500"
                    />
                    {scheduledAt && (
                      <button onClick={() => { setScheduledAt(''); setShowSchedule(false); }} className="ml-2 text-xs text-red-500 hover:underline">Clear</button>
                    )}
                  </div>
                )}
              </div>

              {/* Post target summary */}
              {selectedPlatforms.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Will post to</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlatforms.map(p => {
                      const pl = PLATFORMS.find(x => x.key === p)!;
                      const connected = connectedPlatforms.has(p);
                      return (
                        <span key={p} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${connected ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {pl.label}
                          {!connected && <span className="text-[10px] text-gray-400">(not connected)</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || uploadingMedia || !content.trim() || selectedPlatforms.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={saving || uploadingMedia || !content.trim() || selectedPlatforms.length === 0 || isOverLimit}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  {uploadingMedia ? 'Uploading media...' : saving ? 'Publishing...' : scheduledAt ? 'Schedule Post' : 'Publish Now'}
                </button>
              </div>
            </div>

            {/* ═══ AI Copy Assistant Sidebar ═══ */}
            <div className={`${showAI ? 'block' : 'hidden'} lg:block`}>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 sticky top-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Copy Assistant</h3>
                  </div>
                  <button onClick={() => setShowAI(false)} className="lg:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <XMarkIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Workers AI (Llama 3.1). Describe your post idea and we'll generate engaging copy.</p>

                {/* Tone */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-xs px-3 py-2 focus:ring-2 focus:ring-purple-500"
                  >
                    {TONES.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe what you want to write about..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none placeholder:text-gray-400"
                />

                <button
                  onClick={handleAIGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-purple-600 text-sm font-medium text-white hover:bg-purple-700 transition disabled:opacity-50"
                >
                  <SparklesIcon className="w-4 h-4" />
                  {aiGenerating ? 'Generating...' : 'Generate Copy'}
                </button>

                {aiError && (
                  <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg">{aiError}</p>
                )}

                {/* Quick rewrites (visible when content exists) */}
                {content.trim() && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Quick Rewrites</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        ['More Formal', 'Make it more formal and professional'],
                        ['More Casual', 'Make it fun and casual with emojis'],
                        ['Sales Copy', 'Translate to a more persuasive sales copy'],
                        ['Add CTA', 'Add a strong call to action at the end'],
                      ].map(([label, instr]) => (
                        <button key={label} onClick={() => handleRewrite(instr)} disabled={rewriteLoading}
                          className="px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-[11px] text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:text-purple-700 transition disabled:opacity-50">
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Post Ideas</p>
                  <div className="space-y-1.5">
                    {AI_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setAiPrompt(s)}
                        className="w-full text-left p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-[11px] text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:text-purple-700 dark:hover:text-purple-400 transition line-clamp-2"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
