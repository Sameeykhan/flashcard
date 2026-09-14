/**
 * Consistent Category & Subject Color Token System
 * Dynamically resolves to CSS variables defined in index.css
 * Guaranteed WCAG AA compliance across both Light and Dark themes.
 */

export interface CategoryColorToken {
  key: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export function getCategoryToken(subjectOrCategory: string): CategoryColorToken {
  const norm = (subjectOrCategory || '').toLowerCase().trim();
  let key = 'default';

  if (norm.includes('python') || norm === 'py') {
    key = 'python';
  } else if (norm.includes('javascript') || norm === 'js') {
    key = 'javascript';
  } else if (norm.includes('typescript') || norm === 'ts') {
    key = 'typescript';
  } else if (norm.includes('react')) {
    key = 'react';
  } else if (norm === 'go' || norm.includes('golang')) {
    key = 'go';
  } else if (norm.includes('rust')) {
    key = 'rust';
  } else if (norm.includes('sql') || norm.includes('database')) {
    key = 'sql';
  } else if (norm.includes('devops') || norm.includes('docker') || norm.includes('ci/cd')) {
    key = 'devops';
  } else if (norm.includes('system design') || norm.includes('architecture')) {
    key = 'system-design';
  } else if (
    norm.includes('dsa') ||
    norm.includes('algorithm') ||
    norm.includes('trees') ||
    norm.includes('graph') ||
    norm.includes('data structure')
  ) {
    key = 'dsa';
  }

  return {
    key,
    bg: `var(--cat-${key}-bg)`,
    text: `var(--cat-${key}-text)`,
    border: `var(--cat-${key}-border)`,
    dot: `var(--cat-${key}-dot)`,
  };
}
