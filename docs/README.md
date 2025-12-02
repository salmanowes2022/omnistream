# OmniStream Documentation

Welcome to the OmniStream documentation. This guide will help you understand, set up, and use OmniStream for multi-platform live streaming.

## 📚 Table of Contents

### Getting Started

- [Quick Start Guide](guides/QUICK_START.md) - Get up and running quickly
- [SQLite Setup Guide](guides/QUICK_START_SQLITE.md) - Using SQLite database backend
- [OBS Streaming Guide](guides/OBS_STREAMING_GUIDE.md) - Complete OBS integration tutorial
- [API Quick Reference](guides/API_QUICK_REFERENCE.md) - REST API endpoints reference

### Platform Integration

- [Facebook Integration](platforms/FACEBOOK_QUICK_START.md) - Setting up Facebook Live streaming
- [Facebook Testing Guide](platforms/FACEBOOK_TESTING.md) - Testing Facebook streaming features
- [Facebook Implementation Details](platforms/FACEBOOK_IMPLEMENTATION_SUMMARY.md) - Technical implementation notes

### Architecture & Development

- [Database Migration Guide](architecture/MIGRATION_INSTRUCTIONS.md) - Database setup and migrations
- [PostgreSQL Migration](architecture/POSTGRES_MIGRATION_COMPLETE.md) - PostgreSQL backend setup
- [PostgreSQL Testing Plan](architecture/POSTGRES_MIGRATION_TEST_PLAN.md) - PostgreSQL test scenarios
- [SQLite Migration](architecture/SQLITE_MIGRATION_COMPLETE.md) - SQLite backend implementation
- [OAuth Implementation](architecture/OAUTH_STATUS_FIX.md) - OAuth flow and token management
- [Dashboard Fixes](architecture/DASHBOARD_FIXES_SUMMARY.md) - Web dashboard improvements
- [Implementation Summary](architecture/IMPLEMENTATION_SUMMARY.md) - Overall system architecture

## 🚀 Quick Links

**For Users:**

- Setting up your first stream? Start with [Quick Start Guide](guides/QUICK_START.md)
- Want to stream with OBS? Check [OBS Streaming Guide](guides/OBS_STREAMING_GUIDE.md)
- Need API documentation? See [API Quick Reference](guides/API_QUICK_REFERENCE.md)

**For Developers:**

- Understanding the codebase? Read [Implementation Summary](architecture/IMPLEMENTATION_SUMMARY.md)
- Setting up the database? See [Migration Guide](architecture/MIGRATION_INSTRUCTIONS.md)
- Working with OAuth? Check [OAuth Implementation](architecture/OAUTH_STATUS_FIX.md)

## 🎯 What is OmniStream?

OmniStream is a multi-platform live streaming solution that allows you to:

- Stream to multiple platforms simultaneously (YouTube, Facebook, etc.)
- Use OBS Studio for professional broadcasting
- Manage streams through a web dashboard
- Handle OAuth authentication for each platform
- Monitor stream status and viewer counts in real-time

## 🏗️ System Architecture

```
┌─────────────┐
│  OBS Studio │ (RTMP)
└──────┬──────┘
       │
       v
┌─────────────────┐
│  RTMP Server    │ (Node Media Server + FFmpeg)
└──────┬──────────┘
       │
       v
┌─────────────────┐
│ OmniStream API  │ (Express + Prisma)
└──────┬──────────┘
       │
       v
┌──────────────────────────────┐
│ Platform APIs (YouTube, FB)  │
└──────────────────────────────┘
```

## 📝 Contributing

When adding new documentation:

1. Place guides in `/docs/guides`
2. Place platform-specific docs in `/docs/platforms`
3. Place architecture docs in `/docs/architecture`
4. Update this README with links

## 📖 Additional Resources

- Main README: [../README.md](../README.md)
- PostgreSQL Setup: [guides/postgresql-setup.md](guides/postgresql-setup.md)
- Demo Scripts: [../demo/README.md](../demo/README.md)
