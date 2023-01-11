import * as chalk from 'chalk';
import { dirname, join } from 'path';
import { output } from '../output';
import type { PluginCapabilities } from './models';
import { hasElements } from './shared';
import { readJsonFile } from '../fileutils';
import { getPackageManagerCommand } from '../package-manager';
import { readPluginPackageJson } from '../nx-plugin';

function tryGetCollection<T extends object>(
  packageJsonPath: string,
  collectionFile: string | undefined,
  propName: string
): T | null {
  if (!collectionFile) {
    return null;
  }

  try {
    const collectionFilePath = join(dirname(packageJsonPath), collectionFile);
    return readJsonFile<T>(collectionFilePath)[propName];
  } catch {
    return null;
  }
}

export function getPluginCapabilities(
  pluginName: string
): PluginCapabilities | null {
  try {
    const { json: packageJson, path } = readPluginPackageJson(pluginName);
    return {
      name: pluginName,
      generators:
        tryGetCollection(path, packageJson.generators, 'generators') ||
        tryGetCollection(path, packageJson.generators, 'schematics') ||
        tryGetCollection(path, packageJson.schematics, 'generators') ||
        tryGetCollection(path, packageJson.schematics, 'schematics'),
      executors:
        tryGetCollection(path, packageJson.executors, 'executors') ||
        tryGetCollection(path, packageJson.executors, 'builders') ||
        tryGetCollection(path, packageJson.builders, 'executors') ||
        tryGetCollection(path, packageJson.builders, 'builders'),
    };
  } catch {
    return null;
  }
}

export function listPluginCapabilities(pluginName: string) {
  const plugin = getPluginCapabilities(pluginName);

  if (!plugin) {
    const pmc = getPackageManagerCommand();
    output.note({
      title: `${pluginName} is not currently installed`,
      bodyLines: [
        `Use "${pmc.addDev} ${pluginName}" to install the plugin.`,
        `After that, use "${pmc.exec} nx g ${pluginName}:init" to add the required peer deps and initialize the plugin.`,
      ],
    });

    return;
  }

  const hasBuilders = hasElements(plugin.executors);
  const hasGenerators = hasElements(plugin.generators);

  if (!hasBuilders && !hasGenerators) {
    output.warn({ title: `No capabilities found in ${pluginName}` });
    return;
  }

  const bodyLines = [];

  if (hasGenerators) {
    bodyLines.push(chalk.bold(chalk.green('GENERATORS')));
    bodyLines.push('');
    bodyLines.push(
      ...Object.keys(plugin.generators).map(
        (name) => `${chalk.bold(name)} : ${plugin.generators[name].description}`
      )
    );
    if (hasBuilders) {
      bodyLines.push('');
    }
  }

  if (hasBuilders) {
    bodyLines.push(chalk.bold(chalk.green('EXECUTORS/BUILDERS')));
    bodyLines.push('');
    bodyLines.push(
      ...Object.keys(plugin.executors).map(
        (name) => `${chalk.bold(name)} : ${plugin.executors[name].description}`
      )
    );
  }

  output.log({
    title: `Capabilities in ${plugin.name}:`,
    bodyLines,
  });
}
