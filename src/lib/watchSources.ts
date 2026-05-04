/**
 * watchSources.ts, single source of truth for Watch persistence operations.
 *
 * Watch.tsx (Briefing + Settings tabs) and Settings.tsx (Research panel) both
 * import from here. Each component still owns its in-memory state and calls
 * the shared writer; in-memory caches across components may drift until the
 * page reloads. Acceptable for v1.
 *
 * All helpers are pure async functions: they take explicit parameters, write
 * to Supabase, and resolve with the new list (or void) so the caller can
 * update its setter. Callers wrap calls in try/catch and surface failures via
 * their toast layer.
 */

import { supabase } from "./supabase";

export type WatchConfigFrequency = "daily" | "weekly" | "realtime";

export interface WatchConfigShape {
  competitors: string[];
  thoughtLeaders: string[];
  frequency: WatchConfigFrequency;
  reddit: string[];
}

/** Pure helper, returns a structurally consistent watch_config object the caller can spread into a patch. */
export function buildWatchConfig(parts: WatchConfigShape): WatchConfigShape {
  return {
    competitors: parts.competitors,
    thoughtLeaders: parts.thoughtLeaders,
    frequency: parts.frequency,
    reddit: parts.reddit,
  };
}

/** Replace profiles.sentinel_topics with the supplied list. */
async function writeSentinelTopics(userId: string, topics: string[]): Promise<string[]> {
  const { error } = await supabase.from("profiles").update({ sentinel_topics: topics }).eq("id", userId);
  if (error) throw error;
  return topics;
}

/** Append value to the user's sentinel_topics list. No-op (returns current list) when value is empty or already present. */
export async function addKeyword(userId: string, value: string, currentList: string[]): Promise<string[]> {
  if (!value || currentList.includes(value)) return currentList;
  return writeSentinelTopics(userId, [...currentList, value]);
}

export async function removeKeyword(userId: string, value: string, currentList: string[]): Promise<string[]> {
  return writeSentinelTopics(userId, currentList.filter(x => x !== value));
}

/** Replace profiles.watch_config with the given object. Caller composes the full shape via buildWatchConfig. */
export async function saveWatchConfig(userId: string, config: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("profiles").update({ watch_config: config }).eq("id", userId);
  if (error) throw error;
}

/** Append value to a config-backed list (competitors, thoughtLeaders, reddit) and persist the full watch_config. */
export async function addConfigItem(
  userId: string,
  currentList: string[],
  value: string,
  field: keyof WatchConfigShape,
  baseConfig: WatchConfigShape,
): Promise<string[]> {
  if (!value || currentList.includes(value)) return currentList;
  const updated = [...currentList, value];
  await saveWatchConfig(userId, { ...baseConfig, [field]: updated });
  return updated;
}

export async function removeConfigItem(
  userId: string,
  currentList: string[],
  value: string,
  field: keyof WatchConfigShape,
  baseConfig: WatchConfigShape,
): Promise<string[]> {
  const updated = currentList.filter(x => x !== value);
  await saveWatchConfig(userId, { ...baseConfig, [field]: updated });
  return updated;
}

/** Insert a row into watch_sources. */
export async function addWatchSource(userId: string, type: string, name: string): Promise<void> {
  const { error } = await supabase.from("watch_sources").insert({ user_id: userId, type, name });
  if (error) throw error;
}

/** Delete a row from watch_sources matched by user, type, name. */
export async function deleteWatchSource(userId: string, type: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("watch_sources")
    .delete()
    .eq("user_id", userId)
    .eq("type", type)
    .eq("name", name);
  if (error) throw error;
}

/** Append value to a source-backed list (Newsletter, Podcast, Publication, Substack) and insert into watch_sources. */
export async function addSourceItem(
  userId: string,
  currentList: string[],
  value: string,
  type: string,
): Promise<string[]> {
  if (!value || currentList.includes(value)) return currentList;
  await addWatchSource(userId, type, value);
  return [...currentList, value];
}

export async function removeSourceItem(
  userId: string,
  currentList: string[],
  value: string,
  type: string,
): Promise<string[]> {
  await deleteWatchSource(userId, type, value);
  return currentList.filter(x => x !== value);
}
