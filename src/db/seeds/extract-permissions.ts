import { readFileSync } from 'fs';
import { glob } from 'glob';

export interface SeedPermission {
  name: string;
  slug: string;
  module: string;
  action: string;
  description: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  view: 'View',
  update: 'Update',
  delete: 'Delete',
  hide: 'Hide',
  credit: 'Credit',
  debit: 'Debit',
};

function humanizeModule(module: string): string {
  return module
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function humanizeAction(action: string): string {
  return ACTION_LABELS[action] ?? action.charAt(0).toUpperCase() + action.slice(1);
}

export function slugToPermission(slug: string): SeedPermission {
  const lastDot = slug.lastIndexOf('.');
  const module = slug.slice(0, lastDot);
  const action = slug.slice(lastDot + 1);
  const moduleLabel = humanizeModule(module);
  const actionLabel = humanizeAction(action);

  return {
    name: `${actionLabel} ${moduleLabel}`,
    slug,
    module,
    action,
    description: `Allows ${action} ${moduleLabel.toLowerCase()}`,
  };
}

/**
 * Scans every `**\/admin/*.controller.ts` file for `@Permission('module.action')`
 * decorators and turns each unique slug into a seedable permission row, so new
 * permissions only need to be added once, on the controller route itself.
 */
export async function extractPermissionsFromControllers(): Promise<SeedPermission[]> {
  const controllerFiles = await glob('src/**/admin/*.controller.ts', {
    cwd: process.cwd(),
    absolute: true,
  });

  const slugs = new Set<string>();

  for (const file of controllerFiles) {
    const content = readFileSync(file, 'utf8');
    const matches = content.matchAll(/@Permission\(\s*['"]([^'"]+)['"]\s*\)/g);

    for (const match of matches) {
      slugs.add(match[1]);
    }
  }

  return [...slugs].sort().map(slugToPermission);
}
