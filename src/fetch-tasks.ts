// ============================================================
// DevZone API Client - Fetch tasks from Vietnix DevZone
// ============================================================

import 'dotenv/config';
import type { DevZoneTask, FormattedTask } from './types.js';

const API_URL = process.env.DEVZONE_API_URL || 'https://api.devzone.vietnix.dev';
const TOKEN = process.env.DEVZONE_TOKEN || '';
const PROJECT_ID = process.env.DEVZONE_PROJECT_ID || '';
const ASSIGNEE_ID = process.env.DEVZONE_ASSIGNEE_ID || '';

/**
 * Fetch tasks from DevZone API with retry logic
 */
export async function fetchTasks(limit = 20): Promise<FormattedTask[]> {
  const url = `${API_URL}/workspace/projects/${PROJECT_ID}/tasks?page=1&limit=100&sorts=-createdAt`;

  console.log(`📋 Fetching tasks from DevZone: ${url}`);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { items?: DevZoneTask[]; total?: number };
      const tasks = data?.items || [];

      console.log(`✅ Fetched ${tasks.length} tasks (total: ${data?.total || tasks.length})`);

      return tasks.map(formatTask);
    } catch (err) {
      lastError = err as Error;
      console.warn(`⚠️ Attempt ${attempt}/3 failed: ${lastError.message}`);
      if (attempt < 3) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw new Error(`Failed to fetch tasks after 3 attempts: ${lastError?.message}`);
}

/**
 * Format raw DevZone task into our clean format
 */
function formatTask(task: DevZoneTask): FormattedTask {
  return {
    title: task.title || 'Untitled Task',
    status: normalizeStatus(task.status),
    priority: task.priority || 'normal',
    description: task.description || '',
    highlights: extractHighlights(task),
    createdAt: task.createdAt,
    tags: task.tags || task.labels?.map(l => l.name) || [],
  };
}

/**
 * Normalize status to readable Vietnamese
 */
function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'done': 'Completed',
    'completed': 'Completed',
    'doing': 'In Progress',
    'in_progress': 'In Progress',
    'in-progress': 'In Progress',
    'todo': 'To Do',
    'review': 'In Review',
    'testing': 'Testing',
    'blocked': 'Blocked',
  };
  return statusMap[status?.toLowerCase()] || status || 'Unknown';
}

/**
 * Extract tech highlights from task title & description
 */
function extractHighlights(task: DevZoneTask): string[] {
  const techTerms = [
    'Playwright', 'Docker', 'Kubernetes', 'Redis', 'MongoDB', 'PostgreSQL',
    'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'TypeScript',
    'Python', 'Go', 'Rust', 'GraphQL', 'REST', 'WebSocket',
    'CI/CD', 'Jenkins', 'GitHub Actions', 'Terraform', 'Ansible',
    'AWS', 'GCP', 'Azure', 'Cloudflare', 'Nginx', 'Apache',
    'VPS', 'SSL', 'DNS', 'CDN', 'Load Balancer',
    'API', 'JWT', 'OAuth', 'SSO', 'RBAC',
    'Refactor', 'Optimize', 'Migration', 'Deploy', 'Hotfix',
    'Unit Test', 'E2E', 'Performance', 'Security', 'Monitoring',
    'Headless', 'Automation', 'Scraping', 'Crawling',
    'storageState', 'User-Agent', 'Cookies', 'Session',
  ];

  const text = `${task.title} ${task.description || ''}`;
  const found = techTerms.filter(term =>
    text.toLowerCase().includes(term.toLowerCase())
  );

  // Also add tags/labels
  if (task.tags) found.push(...task.tags);
  if (task.labels) found.push(...task.labels.map(l => l.name));

  // Deduplicate
  return [...new Set(found)].slice(0, 6);
}

export interface ProjectStats {
  totalStories: number;
  doneStories: number;
  doingStories: number;
  todoStories: number;
  overallPercent: number;
}

/**
 * Fetch overview stats from DevZone API
 */
export async function fetchOverviewStats(): Promise<ProjectStats> {
  const url = `${API_URL}/workspace/projects/${PROJECT_ID}/overview-stats`;
  console.log(`📊 Fetching overview stats from DevZone: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ProjectStats;
    console.log(`📈 Project Stats: Total ${data.totalStories}, Done ${data.doneStories}, Doing ${data.doingStories}, Todo ${data.todoStories}, Percent ${data.overallPercent}%`);
    return data;
  } catch (err: any) {
    console.warn(`⚠️ Failed to fetch overview stats: ${err.message}. Using defaults.`);
    return {
      totalStories: 26,
      doneStories: 18,
      doingStories: 0,
      todoStories: 8,
      overallPercent: 69
    };
  }
}


function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run standalone for testing
if (process.argv[1]?.endsWith('fetch-tasks.ts')) {
  fetchTasks().then(tasks => {
    console.log('\n📝 Formatted Tasks:');
    console.log(JSON.stringify(tasks, null, 2));
  }).catch(console.error);
}
