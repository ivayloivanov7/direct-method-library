#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with code ${res.status}`);
  }
}

function execCapture(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with code ${res.status}: ${res.stderr}`);
  }
  return res.stdout.trim();
}

function usage() {
  console.log('Usage: node tools/release.js [version]');
  console.log('If no version is provided, the script will use the version from package.json');
  process.exit(1);
}

// Determine version: positional arg > npm_config_version > npm_config_argv fallback > package.json
let version = process.argv[2]
  || process.env.npm_config_version
  || (process.env.npm_config_argv && (() => {
    try { const parsed = JSON.parse(process.env.npm_config_argv); return parsed.original[1]; } catch { return null; }
  })())
  || null;

if (!version) {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    version = pkg.version;
    console.log(`ℹ️  No version argument provided — using package.json version ${version}`);
  } catch (e) {
    console.error('❌ No version provided and package.json could not be read.');
    usage();
  }
}

if (!/^\d+\.\d+\.\d+(-.*)?$/.test(version)) {
  console.error('❌ Invalid version format. Use semantic versioning, e.g. 1.0.0');
  usage();
}

const branch = `release/${version}`;
const tag = `v${version}`;

try {
  console.log(`🔖 Releasing version ${version}`);
  // Run validation step (must pass before creating release branch)
  console.log('🔎 Validating versions with npm script `version:validate`...');
  run('npm', ['run', 'version:validate']);

  // Ensure working tree is clean
  const status = execCapture('git', ['status', '--porcelain']);
  if (status) {
    throw new Error('Working tree is not clean. Commit or stash your changes before running the release script.');
  }

  // Create release branch (do not modify files)
  // Fail if branch already exists remotely or locally
  let branchExists = false;
  try {
    execCapture('git', ['rev-parse', '--verify', branch]);
    branchExists = true;
  } catch (e) {
    branchExists = false;
  }

  if (branchExists) {
    throw new Error(`Branch ${branch} already exists. Aborting to avoid overwriting.`);
  }

  run('git', ['checkout', '-b', branch]);

  // Create annotated tag
  // If tag exists, abort
  try {
    execCapture('git', ['rev-parse', '--verify', `refs/tags/${tag}`]);
    throw new Error(`Tag ${tag} already exists. Aborting.`);
  } catch (e) {
    // not existing is expected; continue
  }

  // Create annotated tag on the current commit
  run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);

  // Push branch and tag
  console.log('📡 Pushing branch and tag to origin...');
  run('git', ['push', '--set-upstream', 'origin', branch]);
  run('git', ['push', 'origin', tag]);

  console.log(`✅ Release branch ${branch} and tag ${tag} pushed.`);
  console.log(`Next: create a GitHub Release from tag ${tag} or let your CI handle publishing.`);
} catch (err) {
  console.error('❌ Release failed:', err.message);
  // Attempt to rollback branch if we created it and are still on it
  try {
    const current = execCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    if (current === branch) {
      console.log(`Reverting to previous branch and deleting ${branch}...`);
      // checkout previous
      run('git', ['checkout', '-']);
      run('git', ['branch', '-D', branch]);
    }
  } catch (e) {
    // ignore rollback errors
  }
  process.exit(1);
}
