// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { buildRegistryResolver } from '../../artifacts/artifact';
import { i } from '../../i18n';
import { session } from '../../main';
import { selectArtifacts, showArtifacts } from '../artifacts';
import { Command } from '../command';
import { cmdSwitch } from '../format';
import { activate } from '../project';
import { error, log, warning } from '../styling';
import { MSBuildProps } from '../switches/msbuild-props';
import { Project } from '../switches/project';
import { Version } from '../switches/version';
import { WhatIf } from '../switches/whatIf';

export class UseCommand extends Command {
  readonly command = 'use';
  readonly aliases = [];
  seeAlso = [];
  argumentsHelp = [];
  version = new Version(this);
  whatIf = new WhatIf(this);
  project = new Project(this);
  msbuildProps = new MSBuildProps(this);

  get summary() {
    return i`Instantly activates an artifact outside of the project`;
  }

  get description() {
    return [
      i`This will instantly activate an artifact .`,
    ];
  }

  override async run() {
    if (this.inputs.length === 0) {
      error(i`No artifacts specified`);
      return false;
    }

    const resolver = session.globalRegistryResolver.with(
      await buildRegistryResolver(session, (await this.project.manifest)?.metadata.registries));
    const versions = this.version.values;
    if (versions.length && this.inputs.length !== versions.length) {
      error(i`Multiple packages specified, but not an equal number of ${cmdSwitch('version')} switches`);
      return false;
    }

    const selections = new Map(this.inputs.map((v, i) => [v, versions[i] || '*']));
    const artifacts = await selectArtifacts(session, selections, resolver, 1);
    if (!artifacts) {
      return false;
    }

    if (!await showArtifacts(artifacts, resolver, this.commandLine)) {
      warning(i`No artifacts are being acquired`);
      return false;
    }

    const success = await activate(session, artifacts, resolver, false, { force: this.commandLine.force, language: this.commandLine.language, allLanguages: this.commandLine.allLanguages });
    if (success) {
      log(i`Activating individual artifacts`);
    } else {
      return false;
    }
    return true;
  }
}
