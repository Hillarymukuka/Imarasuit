// Marketing module – Posts store
import { create } from 'zustand';
import type { Post, CreatePostData } from '../types';
import { postsAPI } from '../api';

interface PostsState {
  posts: Post[];
  scheduled: Post[];
  loading: boolean;
  error: string | null;

  fetchPosts: (params?: { status?: string; campaignId?: string; limit?: number }) => Promise<void>;
  fetchScheduled: () => Promise<void>;
  getPost: (id: string) => Promise<Post>;
  createPost: (data: CreatePostData) => Promise<Post>;
  updatePost: (id: string, data: Partial<CreatePostData & { status: string }>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  publishPost: (id: string) => Promise<void>;
}

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  scheduled: [],
  loading: false,
  error: null,

  fetchPosts: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await postsAPI.list(params);
      set({ posts: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchScheduled: async () => {
    try {
      const data = await postsAPI.getScheduled();
      set({ scheduled: data });
    } catch (e: any) {
      console.error('Failed to fetch scheduled posts:', e);
    }
  },

  getPost: async (id) => {
    return postsAPI.get(id);
  },

  createPost: async (data) => {
    const post = await postsAPI.create(data);
    set({ posts: [post, ...get().posts] });
    return post;
  },

  updatePost: async (id, data) => {
    const updated = await postsAPI.update(id, data);
    set({
      posts: get().posts.map((p) => (p.id === id ? updated : p)),
      scheduled: get().scheduled.map((p) => (p.id === id ? updated : p)),
    });
  },

  deletePost: async (id) => {
    await postsAPI.delete(id);
    set({
      posts: get().posts.filter((p) => p.id !== id),
      scheduled: get().scheduled.filter((p) => p.id !== id),
    });
  },

  publishPost: async (id) => {
    const updated = await postsAPI.publish(id);
    set({
      posts: get().posts.map((p) => (p.id === id ? updated : p)),
      scheduled: get().scheduled.filter((p) => p.id !== id),
    });
  },
}));
