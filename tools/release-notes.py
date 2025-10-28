#!/usr/bin/env python3

"""
Release notes generator for Direct Method Library

This script generates release notes based on git commits, changelog entries,
and version information across all platform packages.
"""

import subprocess
import json
import re
import sys
from datetime import datetime
from pathlib import Path


def run_command(cmd):
    """Run a shell command and return the output."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command '{cmd}': {e}")
        return None


def get_git_commits_since_tag(tag):
    """Get git commits since the specified tag."""
    if not tag:
        cmd = "git log --oneline --no-merges"
    else:
        cmd = f"git log {tag}..HEAD --oneline --no-merges"
    
    output = run_command(cmd)
    if not output:
        return []
    
    commits = []
    for line in output.split('\n'):
        if line.strip():
            parts = line.split(' ', 1)
            if len(parts) == 2:
                commits.append({
                    'hash': parts[0],
                    'message': parts[1]
                })
    return commits


def get_latest_tag():
    """Get the latest git tag."""
    return run_command("git describe --tags --abbrev=0")


def get_current_versions():
    """Get current version from all packages."""
    versions = {}
    
    # Node.js version
    try:
        with open('packages/sdk-node/package.json', 'r') as f:
            package_json = json.load(f)
            versions['nodejs'] = package_json.get('version', 'unknown')
    except FileNotFoundError:
        versions['nodejs'] = 'unknown'
    
    # .NET version
    try:
        with open('packages/sdk-dotnet/src/DirectMethod.Mqtt.Client/DirectMethod.Mqtt.Client.csproj', 'r') as f:
            content = f.read()
            match = re.search(r'<PackageVersion>(.*?)</PackageVersion>', content)
            versions['dotnet'] = match.group(1) if match else 'unknown'
    except FileNotFoundError:
        versions['dotnet'] = 'unknown'
    
    # Python version (from comment)
    try:
        with open('packages/sdk-python/pyproject.toml', 'r') as f:
            content = f.read()
            match = re.search(r'# Version: (.*)', content)
            versions['python'] = match.group(1) if match else 'auto-versioned'
    except FileNotFoundError:
        versions['python'] = 'unknown'
    
    return versions


def categorize_commits(commits):
    """Categorize commits by type based on conventional commit format."""
    categories = {
        'features': [],
        'fixes': [],
        'docs': [],
        'performance': [],
        'refactor': [],
        'tests': [],
        'ci': [],
        'build': [],
        'other': []
    }
    
    patterns = {
        'features': r'^feat(\(.+\))?: ',
        'fixes': r'^fix(\(.+\))?: ',
        'docs': r'^docs(\(.+\))?: ',
        'performance': r'^perf(\(.+\))?: ',
        'refactor': r'^refactor(\(.+\))?: ',
        'tests': r'^test(\(.+\))?: ',
        'ci': r'^ci(\(.+\))?: ',
        'build': r'^build(\(.+\))?: '
    }
    
    for commit in commits:
        message = commit['message']
        categorized = False
        
        for category, pattern in patterns.items():
            if re.match(pattern, message, re.IGNORECASE):
                categories[category].append(commit)
                categorized = True
                break
        
        if not categorized:
            categories['other'].append(commit)
    
    return categories


def format_commit_message(commit):
    """Format a commit message for release notes."""
    message = commit['message']
    hash_short = commit['hash']
    
    # Remove conventional commit prefix for cleaner display
    clean_message = re.sub(r'^(feat|fix|docs|perf|refactor|test|ci|build)(\(.+\))?: ', '', message, flags=re.IGNORECASE)
    
    # Capitalize first letter
    if clean_message:
        clean_message = clean_message[0].upper() + clean_message[1:]
    
    return f"- {clean_message} ({hash_short})"


def generate_release_notes(version=None, include_commits=True):
    """Generate release notes for the specified version."""
    if not version:
        versions = get_current_versions()
        version = versions.get('nodejs', '1.0.0')
    
    latest_tag = get_latest_tag()
    commits = get_git_commits_since_tag(latest_tag) if include_commits else []
    categorized_commits = categorize_commits(commits)
    current_versions = get_current_versions()
    
    # Generate release notes
    notes = []
    notes.append(f"# Release v{version}")
    notes.append("")
    notes.append(f"Released on {datetime.now().strftime('%Y-%m-%d')}")
    notes.append("")
    
    # Package versions
    notes.append("## Package Versions")
    notes.append("")
    notes.append(f"- **Python**: `direct-method-mqtt-python v{current_versions['python']}`")
    notes.append(f"- **Node.js**: `@direct-method/mqtt-client v{current_versions['nodejs']}`")
    notes.append(f"- **.NET**: `DirectMethod.Mqtt.Client v{current_versions['dotnet']}`")
    notes.append("")
    
    # Installation instructions
    notes.append("## Installation")
    notes.append("")
    notes.append("### Python")
    notes.append("```bash")
    notes.append(f"pip install direct-method-mqtt-python=={current_versions['python']}")
    notes.append("```")
    notes.append("")
    notes.append("### Node.js")
    notes.append("```bash")
    notes.append(f"npm install @direct-method/mqtt-client@{current_versions['nodejs']}")
    notes.append("```")
    notes.append("")
    notes.append("### .NET")
    notes.append("```bash")
    notes.append(f"dotnet add package DirectMethod.Mqtt.Client --version {current_versions['dotnet']}")
    notes.append("```")
    notes.append("")
    
    # Changes section
    if include_commits and commits:
        notes.append("## What's Changed")
        notes.append("")
        
        if latest_tag:
            notes.append(f"Changes since {latest_tag}:")
        else:
            notes.append("Initial release with the following changes:")
        notes.append("")
        
        # Features
        if categorized_commits['features']:
            notes.append("### ✨ New Features")
            for commit in categorized_commits['features']:
                notes.append(format_commit_message(commit))
            notes.append("")
        
        # Bug fixes
        if categorized_commits['fixes']:
            notes.append("### 🐛 Bug Fixes")
            for commit in categorized_commits['fixes']:
                notes.append(format_commit_message(commit))
            notes.append("")
        
        # Documentation
        if categorized_commits['docs']:
            notes.append("### 📚 Documentation")
            for commit in categorized_commits['docs']:
                notes.append(format_commit_message(commit))
            notes.append("")
        
        # Performance improvements
        if categorized_commits['performance']:
            notes.append("### ⚡ Performance Improvements")
            for commit in categorized_commits['performance']:
                notes.append(format_commit_message(commit))
            notes.append("")
        
        # Refactoring
        if categorized_commits['refactor']:
            notes.append("### 🔧 Code Refactoring")
            for commit in categorized_commits['refactor']:
                notes.append(format_commit_message(commit))
            notes.append("")
        
        # CI/CD and build changes
        ci_build_commits = categorized_commits['ci'] + categorized_commits['build']
        if ci_build_commits:
            notes.append("### 🚀 CI/CD & Build")
            for commit in ci_build_commits:
                notes.append(format_commit_message(commit))
            notes.append("")
        
        # Other changes
        if categorized_commits['other']:
            notes.append("### 🔄 Other Changes")
            for commit in categorized_commits['other']:
                notes.append(format_commit_message(commit))
            notes.append("")
    
    # Links and additional info
    notes.append("## Links")
    notes.append("")
    notes.append("- [Full Changelog](https://github.com/ivayloivanov7/direct-method-library/blob/main/global-changelog/CHANGELOG.md)")
    notes.append("- [Documentation](https://github.com/ivayloivanov7/direct-method-library)")
    notes.append("- [Issues](https://github.com/ivayloivanov7/direct-method-library/issues)")
    notes.append("")
    
    if commits:
        notes.append(f"**Full Changelog**: https://github.com/ivayloivanov7/direct-method-library/commits/v{version}")
    
    return '\n'.join(notes)


def main():
    """Main function to handle command line arguments."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate release notes for Direct Method Library')
    parser.add_argument('--version', help='Version number for the release')
    parser.add_argument('--no-commits', action='store_true', help='Exclude commit history from release notes')
    parser.add_argument('--output', help='Output file path (default: stdout)')
    
    args = parser.parse_args()
    
    # Generate release notes
    notes = generate_release_notes(
        version=args.version,
        include_commits=not args.no_commits
    )
    
    # Output release notes
    if args.output:
        with open(args.output, 'w') as f:
            f.write(notes)
        print(f"Release notes written to {args.output}")
    else:
        print(notes)


if __name__ == '__main__':
    main()