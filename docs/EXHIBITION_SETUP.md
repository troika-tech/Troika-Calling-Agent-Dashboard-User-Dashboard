# Exhibition Demo Dashboard Setup Guide

## Quick Start

1. **Enable Demo Mode**
   - Open `src/config.js`
   - Set `demoMode: true` (line 77)

2. **Configure Demo Parameters** (Optional)
   - Edit `src/config.js` lines 78-94
   - Adjust stats: totalCalls, pickupRate, completionRate, etc.

3. **Add Real Recordings** (Optional)
   - Place 30-40 MP3 files in `public/recordings/`
   - Update `src/config/realRecordings.js` with file paths

4. **Build & Deploy**
   ```bash
   npm install
   npm run build
   npm run preview
   ```

5. **Access Dashboard**
   - Open browser to `http://localhost:4173`
   - Login with any credentials (demo mode bypasses auth)

---

## Demo Statistics

The dashboard showcases:

- **Total Calls**: 119,847 over 3 months
- **Pickup Rate**: 78% (configurable)
- **Completion Rate**: 67% (configurable)
- **Campaigns**: 43 across 10 templates
- **Avg Call Duration**: 2m 22s
- **Credit Balance**: 248,750
- **Leads**: 487
- **Scheduled Calls**: 438
- **Call Direction**: 75% outbound, 25% inbound

---

## Exhibition Tips

### Before the Exhibition

1. **Test all pages**: Dashboard, Analytics, Call Logs, Campaigns
2. **Verify real recordings play** in first 40 calls
3. **Check mobile responsiveness** for tablet displays
4. **Bookmark impressive views**:
   - Dashboard with large numbers
   - Analytics showing distribution charts
   - Call logs with transcripts

### During the Exhibition

1. **Highlight impressive stats**:
   - Point to 120k total calls
   - Show 78% pickup rate
   - Demonstrate transcript quality

2. **Demo features**:
   - Live charts (weekly call volume)
   - Call transcripts with real conversations
   - Campaign performance metrics
   - Audio recordings (first 40)

3. **Navigation flow**:
   - Start at Dashboard (overview)
   - Click Analytics (detailed charts)
   - Show Call Logs (individual calls)
   - Filter by status/date (demonstrate filtering)

### Talking Points

- "119,847 calls handled by AI in just 3 months"
- "78% pickup rate - better than human agents"
- "67% completion rate shows engagement"
- "Real-time transcription in multiple languages"
- "Cost-effective: ₹1.20 per call average"
- "487 qualified leads generated automatically"
- "438 calls scheduled for follow-up"
- "Handles both outbound and inbound calls efficiently"

---

## Switching Back to Live Mode

1. Open `src/config.js`
2. Set `demoMode: false`
3. Rebuild: `npm run build`
4. Connects to real API at configured URL

---

## Troubleshooting

**Issue**: Slow page loads
- **Solution**: Reduce `demo.totalCalls` in config.js to 50,000 or lower

**Issue**: Recordings don't play
- **Solution**: Check file paths in `src/config/realRecordings.js`
- Ensure files are in `public/recordings/`

**Issue**: Stats look unrealistic
- **Solution**: Adjust rates in config:
  - `pickupRate`: 70-85 (realistic range)
  - `completionRate`: 60-75 (realistic range)

**Issue**: "Demo Mode" badge showing in production
- **Solution**: Set `demoMode: false` in `src/config.js`

---

## Technical Architecture

```
src/
├── config.js                    # Demo mode toggle & parameters
├── config/
│   └── realRecordings.js       # Real recording URL mappings
├── utils/
│   └── demoDataGenerator.js    # Generates 120k calls on-demand
└── services/
    └── api.js                  # API layer with demo mode checks
```

**How it works**:
1. `config.js` sets `demoMode: true`
2. API calls check `DEMO_MODE` flag
3. If true, return generated data from `demoDataGenerator`
4. If false, call real backend APIs
5. Components work identically in both modes

---

## Support

For issues or questions:
- Check `docs/plans/2026-01-17-exhibition-demo-dashboard.md`
- Review code comments in modified files
- Contact development team
