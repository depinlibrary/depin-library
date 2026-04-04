## Auto-Recurring Hourly Predictions

### Database Changes
1. **New `hourly_forecast_config` table** — admin selects which projects have hourly predictions enabled, with cooldown duration (default 10 min)
2. **New `hourly_forecast_rounds` table** — tracks each round: start time, end time, start price, end price, outcome, status (active/cooldown/resolved), round number
3. **New `hourly_forecast_votes` table** — user votes per round (yes = price goes up, no = price goes down)

### Edge Function: `run-hourly-forecasts`
- Scheduled to run every minute via pg_cron
- For each enabled project config:
  - If no active round exists and cooldown has passed → create new round, capture start price from `token_market_data`
  - If active round's 1 hour has elapsed → capture end price, resolve outcome (up/down/flat), mark round as resolved, start 10-min cooldown
- Uses existing CoinGecko price data already in `token_market_data`

### Admin UI
- New tab in Admin Dashboard: "Hourly Predictions"
- Toggle projects on/off for hourly predictions
- Configure cooldown duration per project

### Frontend (Forecasts Page)
- Featured "Live Hourly Predictions" section at top of Forecasts page
- Shows: project logo, "Will [Token] go UP in the next hour?", countdown timer, live vote percentages, vote buttons
- During cooldown: shows "Next round in X:XX" countdown
- Past rounds history with outcomes and voter accuracy stats

### Resolution Logic
- Compare `start_price` vs `end_price` from `token_market_data`
- If end > start → outcome = "yes" (went up)
- If end < start → outcome = "no" (went down)  
- If end = start → outcome = "draw" (no change)
