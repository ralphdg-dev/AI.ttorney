import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const createWebStorage = () => {
  return {
    getItem: (key: string): Promise<string | null> => {
      if (typeof window !== "undefined" && window.localStorage) {
        return Promise.resolve(window.localStorage.getItem(key));
      }
      return Promise.resolve(null);
    },
    setItem: (key: string, value: string): Promise<void> => {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return Promise.resolve();
    },
    removeItem: (key: string): Promise<void> => {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return Promise.resolve();
    },
  };
};

// Use appropriate storage based on platform
const storage = Platform.OS === "web" ? createWebStorage() : AsyncStorage;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Auth helper functions
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
};

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  return { session, error };
};

export const onAuthStateChange = (
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Database helper functions
export const db = {
  // Users
  users: {
    get: (id: string) =>
      supabase.from("users").select("*").eq("id", id).single(),
    getAll: () => supabase.from("users").select("*"),
    create: (user: Database["public"]["Tables"]["users"]["Insert"]) =>
      supabase.from("users").insert(user).select().single(),
    update: (
      id: string,
      updates: Database["public"]["Tables"]["users"]["Update"]
    ) => supabase.from("users").update(updates).eq("id", id).select().single(),
    delete: (id: string) => supabase.from("users").delete().eq("id", id),
  },

  // Chatbot
  chatbot: {
    logs: {
      get: (id: number) =>
        supabase.from("chatbot_logs").select("*").eq("id", id).single(),
      getAll: () => supabase.from("chatbot_logs").select("*"),
      getAllFlagged: () => 
        supabase.from("chatbot_logs").select("*").eq("flagged", true),
      getByUser: (userId: string) =>
        supabase.from("chatbot_logs").select("*").eq("user_id", userId),
      create: (log: Database["public"]["Tables"]["chatbot_logs"]["Insert"]) =>
        supabase.from("chatbot_logs").insert(log).select().single(),
      update: (
        id: number,
        updates: Database["public"]["Tables"]["chatbot_logs"]["Update"]
      ) =>
        supabase
          .from("chatbot_logs")
          .update(updates)
          .eq("id", id)
          .select()
          .single(),
      flag: (id: number) =>
        supabase
          .from("chatbot_logs")
          .update({ flagged: true })
          .eq("id", id)
          .select()
          .single(),
      unflag: (id: number) =>
        supabase
          .from("chatbot_logs")
          .update({ flagged: false })
          .eq("id", id)
          .select()
          .single(),
    },
  },

  // Forum
  forum: {
    posts: {
      get: (id: string) =>
        supabase.from("forum_posts").select("*").eq("id", id).single(),
      getAll: () => supabase.from("forum_posts").select("*"),
      getByUser: (userId: string) =>
        supabase.from("forum_posts").select("*").eq("user_id", userId),
      create: (post: Database["public"]["Tables"]["forum_posts"]["Insert"]) =>
        supabase.from("forum_posts").insert(post).select().single(),
      update: (
        id: string,
        updates: Database["public"]["Tables"]["forum_posts"]["Update"]
      ) =>
        supabase
          .from("forum_posts")
          .update(updates)
          .eq("id", id)
          .select()
          .single(),
      delete: (id: string) =>
        supabase.from("forum_posts").delete().eq("id", id),
    },
    replies: {
      get: (id: string) =>
        supabase.from("forum_replies").select("*").eq("id", id).single(),
      getByPost: (postId: string) =>
        supabase.from("forum_replies").select("*").eq("post_id", postId),
      create: (
        reply: Database["public"]["Tables"]["forum_replies"]["Insert"]
      ) => supabase.from("forum_replies").insert(reply).select().single(),
      update: (
        id: string,
        updates: Database["public"]["Tables"]["forum_replies"]["Update"]
      ) =>
        supabase
          .from("forum_replies")
          .update(updates)
          .eq("id", id)
          .select()
          .single(),
    },
    reports: {
      create: (
        report: Database["public"]["Tables"]["forum_reports"]["Insert"]
      ) => supabase.from("forum_reports").insert(report).select().single(),
    },
  },

  // Legal
  legal: {
    articles: {
      get: (id: string) =>
        supabase.from("legal_articles").select("*").eq("id", id).single(),
      getAll: () => supabase.from("legal_articles").select("*"),
      getByDomain: (domain: string) =>
        supabase.from("legal_articles").select("*").eq("domain", domain),
      create: (
        article: Database["public"]["Tables"]["legal_articles"]["Insert"]
      ) => supabase.from("legal_articles").insert(article).select().single(),
      update: (
        id: string,
        updates: Database["public"]["Tables"]["legal_articles"]["Update"]
      ) =>
        supabase
          .from("legal_articles")
          .update(updates)
          .eq("id", id)
          .select()
          .single(),
    },
    glossary: {
      get: (id: string) =>
        supabase.from("glossary_terms").select("*").eq("id", id).single(),
      getAll: () => supabase.from("glossary_terms").select("*"),
      getByDomain: (domain: string) =>
        supabase.from("glossary_terms").select("*").eq("domain", domain),
      search: (term: string) =>
        supabase
          .from("glossary_terms")
          .select("*")
          .ilike("term_en", `%${term}%`),
    },
  },

  // Lawyer
  lawyer: {
    applications: {
      get: (id: string) =>
        supabase.from("lawyer_applications").select("*").eq("id", id).single(),
      getByUser: (userId: string) =>
        supabase.from("lawyer_applications").select("*").eq("user_id", userId),
      create: (
        application: Database["public"]["Tables"]["lawyer_applications"]["Insert"]
      ) =>
        supabase
          .from("lawyer_applications")
          .insert(application)
          .select()
          .single(),
      update: (
        id: string,
        updates: Database["public"]["Tables"]["lawyer_applications"]["Update"]
      ) =>
        supabase
          .from("lawyer_applications")
          .update(updates)
          .eq("id", id)
          .select()
          .single(),
    },
    consultations: {
      get: (id: string) =>
        supabase
          .from("consultation_requests")
          .select("*")
          .eq("id", id)
          .single(),
      getByUser: (userId: string) =>
        supabase
          .from("consultation_requests")
          .select("*")
          .eq("user_id", userId),
      getByLawyer: (lawyerId: string) =>
        supabase
          .from("consultation_requests")
          .select("*")
          .eq("lawyer_id", lawyerId),
      create: (
        request: Database["public"]["Tables"]["consultation_requests"]["Insert"]
      ) =>
        supabase
          .from("consultation_requests")
          .insert(request)
          .select()
          .single(),
      update: (
        id: string,
        updates: Database["public"]["Tables"]["consultation_requests"]["Update"]
      ) =>
        supabase
          .from("consultation_requests")
          .update(updates)
          .eq("id", id)
          .select()
          .single(),
    },
  },

  // User preferences
  userPreferences: {
    bookmarks: {
      getByUser: (userId: string) =>
        supabase.from("user_forum_bookmarks").select("*").eq("user_id", userId),
      create: (
        bookmark: Database["public"]["Tables"]["user_forum_bookmarks"]["Insert"]
      ) =>
        supabase
          .from("user_forum_bookmarks")
          .insert(bookmark)
          .select()
          .single(),
      delete: (id: string) =>
        supabase.from("user_forum_bookmarks").delete().eq("id", id),
    },
    favorites: {
      getByUser: (userId: string) =>
        supabase
          .from("user_glossary_favorites")
          .select("*")
          .eq("user_id", userId),
      create: (
        favorite: Database["public"]["Tables"]["user_glossary_favorites"]["Insert"]
      ) =>
        supabase
          .from("user_glossary_favorites")
          .insert(favorite)
          .select()
          .single(),
      delete: (id: string) =>
        supabase.from("user_glossary_favorites").delete().eq("id", id),
    },
  },
};
