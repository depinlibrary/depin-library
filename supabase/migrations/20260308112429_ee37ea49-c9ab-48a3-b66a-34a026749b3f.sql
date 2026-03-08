-- Add column to track if end notifications were sent
ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS end_notifications_sent boolean NOT NULL DEFAULT false;

-- Add notification preference for forecast results
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS forecast_result boolean NOT NULL DEFAULT true;