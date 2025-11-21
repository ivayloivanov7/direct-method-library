#!/usr/bin/env node

/**
 * Version synchronization utility for Direct Method Library
 * 
 * This script ensures all packages maintain synchronized version numbers
 * across the different language implementations.
 */

const fs = require('fs');
const path = require('path');

const PACKAGES = {
  node: 'packages/sdk-node/package.json',
  dotnet: 'packages/sdk-dotnet/src/DirectMethod.Mqtt.Client/DirectMethod.Mqtt.Client.csproj',
  python: 'packages/sdk-python/pyproject.toml'
};

function getCurrentVersion() {
  // Read version from the repository root package.json (main package) as the source of truth
  const rootPkgPath = path.resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  return packageJson.version;
}

function getSdkNodeVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGES.node, 'utf8'));
    return pkg.version;
  } catch (e) {
    return 'Not found';
  }
}

function updateNodeJsVersion(newVersion) {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGES.node, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(PACKAGES.node, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ Updated Node.js package to version ${newVersion}`);
}

function updateRootVersion(newVersion) {
  const rootPkgPath = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(rootPkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ Updated root package.json version to ${newVersion}`);
}

function updateDotNetVersion(newVersion) {
  let csprojContent = fs.readFileSync(PACKAGES.dotnet, 'utf8');
  
  // Update PackageVersion
  csprojContent = csprojContent.replace(
    /<PackageVersion>.*<\/PackageVersion>/,
    `<PackageVersion>${newVersion}</PackageVersion>`
  );
  
  fs.writeFileSync(PACKAGES.dotnet, csprojContent);
  console.log(`✅ Updated .NET package to version ${newVersion}`);
}

function updatePythonVersion(newVersion) {
  let pyprojectContent = fs.readFileSync(PACKAGES.python, 'utf8');

  // Update actual version = "x.y.z" in the [project] section of pyproject.toml
  // If the [project] section doesn't exist, prepend it.
  const projectSectionRegex = /^\[project\][\s\S]*?(?=^\[|\z)/m;
  const projectMatch = pyprojectContent.match(projectSectionRegex);

  if (projectMatch) {
    let projectBlock = projectMatch[0];

    if (/^\s*version\s*=.*/m.test(projectBlock)) {
      // replace existing version line
      projectBlock = projectBlock.replace(/^\s*version\s*=.*$/m, `version = "${newVersion}"`);
    } else {
      // insert version after the [project] header or after the name field if present
      const lines = projectBlock.split('\n');
      let insertAt = 1; // after [project]
      for (let i = 1; i < lines.length; i++) {
        if (/^\s*name\s*=/.test(lines[i])) { insertAt = i + 1; break; }
      }
      lines.splice(insertAt, 0, `version = "${newVersion}"`);
      projectBlock = lines.join('\n');
    }

    pyprojectContent = pyprojectContent.replace(projectSectionRegex, projectBlock);
  } else {
    // No [project] section; prepend one with version
    pyprojectContent = `[project]\nversion = "${newVersion}"\n\n` + pyprojectContent;
  }

  fs.writeFileSync(PACKAGES.python, pyprojectContent);
  console.log(`✅ Updated Python package version to ${newVersion} in ${PACKAGES.python}`);
}

function syncVersions(targetVersion = null) {
  const currentVersion = getCurrentVersion();
  const versionToUse = targetVersion || currentVersion;
  
  console.log(`🔄 Synchronizing all packages to version ${versionToUse}`);
  console.log(`📦 Root package version: ${currentVersion}`);
  const sdkNodeVersion = getSdkNodeVersion();
  console.log(`📦 packages/sdk-node version: ${sdkNodeVersion}`);

  // Always ensure the SDK Node package.json matches the versionToUse
    if (targetVersion && targetVersion !== currentVersion) {
      // Update root package.json first so it's the canonical source going forward
      updateRootVersion(targetVersion);
      // refresh currentVersion to the updated root
      // (not strictly necessary here since we use versionToUse below)
      // ensure sdk-node is updated as well
      updateNodeJsVersion(targetVersion);
  }

  updateDotNetVersion(versionToUse);
  updatePythonVersion(versionToUse);
  
  console.log(`\n✨ Version synchronization complete!`);
  console.log(`📋 All packages are now at version ${versionToUse}`);
}

function validateVersions() {
  console.log('🔍 Validating version consistency...\n');
  
  const rootVersion = getCurrentVersion();
  console.log(`📦 Root package: ${rootVersion}`);

  const sdkNodeVersion = getSdkNodeVersion();
  console.log(`📦 SDK Node package: ${sdkNodeVersion}`);
  
  // Check .NET version
  const csprojContent = fs.readFileSync(PACKAGES.dotnet, 'utf8');
  const dotnetMatch = csprojContent.match(/<PackageVersion>(.*)<\/PackageVersion>/);
  const dotnetVersion = dotnetMatch ? dotnetMatch[1] : 'Not found';
  console.log(`📦 .NET: ${dotnetVersion}`);
  
  // Check Python version comment
  const pyprojectContent = fs.readFileSync(PACKAGES.python, 'utf8');
  let pythonVersion = 'Not found';
  const projectSectionRegex = /^\[project\][\s\S]*?(?=^\[|\z)/m;
  const projectMatch = pyprojectContent.match(projectSectionRegex);
  if (projectMatch) {
    const versionMatch = projectMatch[0].match(/^\s*version\s*=\s*["']([^"']+)["']/m);
    if (versionMatch) pythonVersion = versionMatch[1];
  }
  console.log(`📦 Python: ${pythonVersion} (from pyproject.toml)`);

  // Validate consistency across all platforms
  const allVersions = [rootVersion, sdkNodeVersion, dotnetVersion, pythonVersion].filter(v => v && v !== 'Not found');
  const uniqueVersions = [...new Set(allVersions)];

  if (uniqueVersions.length === 1) {
    console.log(`\n✅ All packages are synchronized at version ${uniqueVersions[0]}`);
    return true;
  } else {
    console.log(`\n❌ Version mismatch detected!`);
    // Print per-package versions to help debugging
    console.log(`   root: ${rootVersion}`);
    console.log(`   sdk-node: ${sdkNodeVersion}`);
    console.log(`   dotnet: ${dotnetVersion}`);
    console.log(`   python: ${pythonVersion}`);
    // set non-zero exit code for CI
    process.exitCode = 1;
    return false;
  }
}

function displayHelp() {
  console.log(`
Direct Method Library - Version Sync Tool

Usage:
  node tools/version-sync.js [command] [version]

Commands:
  validate     Check if all package versions are synchronized
  sync         Synchronize all packages to current Node.js version
  sync [ver]   Synchronize all packages to specified version
  help         Show this help message

Examples:
  node tools/version-sync.js validate
  node tools/version-sync.js sync
  node tools/version-sync.js sync 1.2.0

Notes:
  - Node.js package.json is used as the source of truth
  - Python uses setuptools_scm for automatic versioning from git tags
  - .NET csproj PackageVersion is updated directly
`);
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];
const version = args[1];

switch (command) {
  case 'validate':
    validateVersions();
    break;
    
  case 'sync':
    if (version) {
      // Validate version format (basic semver check)
      if (!/^\d+\.\d+\.\d+(-.*)?$/.test(version)) {
        console.error(`❌ Invalid version format: ${version}`);
        console.error(`   Version should follow semantic versioning (e.g., 1.0.0)`);
        process.exit(1);
      }
    }
    syncVersions(version);
    break;
    
  case 'help':
  case '--help':
  case '-h':
    displayHelp();
    break;
    
  default:
    if (command) {
      console.error(`❌ Unknown command: ${command}`);
    }
    displayHelp();
    process.exit(1);
}