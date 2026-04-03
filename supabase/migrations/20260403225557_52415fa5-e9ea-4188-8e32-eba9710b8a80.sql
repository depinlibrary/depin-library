
ALTER TABLE forecast_votes ADD CONSTRAINT vote_valid CHECK (vote IN ('yes', 'no'));
ALTER TABLE forecast_votes ADD CONSTRAINT confidence_range CHECK (confidence_level IS NULL OR confidence_level BETWEEN 1 AND 5);

ALTER TABLE project_ratings ADD CONSTRAINT rating_range CHECK (
  utility_rating BETWEEN 1 AND 5
  AND tokenomics_rating BETWEEN 1 AND 5
  AND adoption_rating BETWEEN 1 AND 5
  AND hardware_rating BETWEEN 1 AND 5
);

ALTER TABLE price_alerts ADD CONSTRAINT direction_valid CHECK (direction IN ('up', 'down', 'both'));
ALTER TABLE price_alerts ADD CONSTRAINT threshold_positive CHECK (threshold_percent > 0);

ALTER TABLE forecasts ADD CONSTRAINT prediction_direction_valid CHECK (prediction_direction IS NULL OR prediction_direction IN ('long', 'short'));
