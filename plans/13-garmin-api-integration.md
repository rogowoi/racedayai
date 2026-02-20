# Garmin API Integration Plan for RaceDayAI

## 1. Introduction

This document outlines a detailed plan for integrating the Garmin API into the RaceDayAI platform. The primary goal of this integration is to enrich RaceDayAI's personalized race-day execution plans by leveraging comprehensive health and fitness data from Garmin devices. By incorporating Garmin's extensive data, RaceDayAI can provide more accurate, personalized, and dynamic recommendations for pacing, nutrition, hydration, and real-time adjustments.

## 2. Garmin API Capabilities

The Garmin Connect Developer Program provides access to a wide array of health and fitness data through several cloud-to-cloud REST APIs. These interfaces allow for the retrieval of valuable metrics that can significantly enhance RaceDayAI's analytical capabilities.

### Health API
The Health API enables leveraging all-day health metrics. Data is provided in **JSON format** summarizing individual user data.
*   **Steps & Intensity Minutes**: Daily and epoch-level activity tracking.
*   **Sleep**: Sleep times, sleep stages (deep, light, REM, awake), and sleep scores.
*   **Heart Rate**: All-day heart rate and second-level HR during activities.
*   **Stress**: Detailed stress levels and stress scores.
*   **Body Battery**: Energy monitoring samples over time.
*   **Respiration & Pulse Ox**: Breathing rates and blood oxygen saturation.
*   **Body Composition**: Weight, BMI, body fat, muscle mass, etc.
*   **Blood Pressure**: Manual or device-synced blood pressure readings.
*   **Enhanced Beat-To-Beat Interval**: Granular HRV data (requires license fee for commercial use).

### Activity API
The Activity API provides access to detailed fitness data captured during specific activities.
*   **Activity Types**: Running, Cycling, Swimming, Yoga, Strength Training, etc.
*   **Data Formats**: Access to **FIT files** (primary), GPX, and TCX formats.
*   **Metrics**: GPS tracks, pace, distance, elevation, power, cadence, and advanced running dynamics.

### Training API
The Training API allows for a two-way interaction with the Garmin ecosystem.
*   **Workouts**: Publish custom workouts directly to the Garmin Connect calendar.
*   **Training Plans**: Sync full training plans that users can follow on their devices.

### Other APIs
*   **Courses API**: Publish courses/routes to Garmin devices.
*   **Women's Health API**: Menstrual cycle tracking and pregnancy information.

## 3. Integration Strategy

The integration will follow a strategy that leverages the existing architecture and complements data from Strava and Open-Meteo.

### Data Flow

1.  **User Authorization**: Users will authorize RaceDayAI via **OAuth 2.0 with PKCE**.
2.  **Data Retrieval**: 
    *   **Architecture**: Supports both **Push (Webhooks)** and **Ping/Pull**. RaceDayAI will prioritize Push for real-time updates.
    *   **Backfill**: The API supports backfilling user data to populate historical context.
3.  **Data Storage**: Stored in Neon PostgreSQL via Prisma.
4.  **Data Processing**: Normalization and feature engineering for the AI model.
5.  **AI Model Input**: Processed data serves as input to Claude 3.5 Sonnet.

### Technical Stack Alignment

*   **Frontend**: Next.js 16 + Tailwind CSS v4 + shadcn/ui for auth and data visualization.
*   **Database**: Neon PostgreSQL + Prisma for schema management.
*   **AI**: Claude 3.5 Sonnet with refined prompts for physiological context.
*   **APIs**: Robust handling for Garmin, Strava, and Open-Meteo.

## 4. Leveraging Capabilities for RaceDayAI

*   **Recovery Analysis**: Use Sleep, Stress, and Body Battery to adjust training intensity and race-day expectations.
*   **Fitness Tracking**: Use VO2 Max and Activity history to set realistic performance goals.
*   **Physiological Context**: Use Heart Rate and Respiration to personalize nutrition and hydration needs.
*   **Direct Guidance**: Use the Training API to push the generated RaceDayAI execution plan as a "Workout" directly to the user's Garmin watch.

## 5. Technical Considerations

### Authentication
The Garmin Connect API has transitioned to **OAuth 2.0 (specifically OAuth 2.0 with PKCE)**.
*   This replaces the older OAuth 1.0a requirement mentioned in earlier drafts.
*   Implementation will involve standard OAuth 2.0 flows: Authorization Request, Token Exchange (with PKCE challenge), and Token Refresh.

### Rate Limits
*   **Evaluation Environment**: Typically 200 API call requests per user per day (rolling 24-hour window).
*   **Production Environment**: Higher limits, such as 10,000 days of data per minute for enterprise-level integrations.
*   RaceDayAI must implement efficient syncing and respect headers for rate limit status.

### Webhooks (Push Architecture)
*   Garmin can push data notifications to a RaceDayAI endpoint as soon as a user syncs their device.
*   This reduces the need for polling and ensures the AI has the latest data before a race.

## 6. Additional Performance Metrics from Garmin

To further enhance the personalization and accuracy of RaceDayAI's plans, the following performance metrics will be integrated from Garmin:

*   **FTP (Functional Threshold Power)**: Critical for precise cycling pacing and intensity recommendations.
*   **Threshold Pace**: Essential for accurate running pace guidance, especially for longer distances.
*   **Threshold Heart Rate**: Provides a physiological benchmark for training zones and race effort.
*   **VO2 Max**: A key indicator of aerobic fitness, useful for setting realistic performance goals and predicting race times.
*   **Training Load / Training Status**: Offers insights into an athlete's recent training stress and recovery, allowing for dynamic adjustments to race plans to prevent overtraining or under-recovery.
*   **Other Performance Metrics**: Any other relevant performance metrics available through the Garmin Health or Activity APIs that can contribute to a more comprehensive athlete profile and plan generation.

### Wizard-Style Onboarding Flow

To facilitate the collection of these metrics, a wizard-style onboarding flow will be implemented:

1.  **Connect Garmin**: Users will be guided through the OAuth 2.0 process to connect their Garmin account securely.
2.  **Data Sync**: Upon successful connection, RaceDayAI will automatically pull historical and recent performance data from Garmin, including the metrics listed above.
3.  **Profile Population**: The collected Garmin data will be used to pre-populate the user's profile within RaceDayAI, reducing manual input and ensuring data accuracy.
4.  **User Review**: Users will have the opportunity to review the imported data and make any necessary adjustments or confirm its accuracy.

## 7. Next Steps

1.  **Finalize Developer Access**: Marc Lussi has provided access; confirm credentials in the Developer Portal.
2.  **OAuth 2.0 PKCE Implementation**: Implement the modern auth flow.
3.  **Webhook Endpoint**: Set up a listener for Garmin push notifications.
4.  **FIT File Parser**: Implement a parser for detailed activity data from FIT files.
5.  **Training API Integration**: Develop the "Push to Watch" feature for race plans.

## References

[1] Garmin Connect Developer Program - Health API: https://developer.garmin.com/gc-developer-program/health-api/
[2] Garmin Connect Developer Program - Activity API: https://developer.garmin.com/gc-developer-program/activity-api/
[3] Garmin Connect Developer Program - OAuth 2.0 PKCE Spec: https://developerportal.garmin.com/sites/default/files/OAuth2PKCE_1.pdf

## 8. Algorithm Improvements with Enhanced Garmin Data

Integrating a richer set of Garmin data, including FTP, Threshold Pace, Threshold Heart Rate, VO2 Max, and Training Load/Status, will significantly enhance the intelligence, personalization, and accuracy of RaceDayAI's race-day execution plans. These metrics provide a deeper physiological understanding of the athlete, allowing for more nuanced and adaptive algorithmic adjustments.

### 8.1 Pacing Logic Enhancements

**Current Pacing Logic (from `apps/web/src/lib/engine/pacing.ts`):**

*   **Bike Pacing**: Relies on a fixed `intensityFactor` based on race distance and a simplified `ftp` input. Speed estimation uses a basic heuristic. Fatigue from bike TSS impacts run pacing.
*   **Run Pacing**: Primarily uses `thresholdPaceSec` and adjusts for `bikeTss` (fatigue factor) and `distanceKm` (distance factor).
*   **Swim Pacing**: Uses `cssPer100m` and adjusts for distance.

**Proposed Improvements with Garmin Data:**

*   **Dynamic FTP and Threshold Pace**: Instead of relying on manually entered or estimated values, direct FTP and Threshold Pace from Garmin will provide highly accurate baseline performance metrics. This eliminates estimation errors and ensures the pacing calculations are grounded in the athlete's current physiological capabilities.
    *   **Impact**: More precise `targetPower` for cycling and `targetPaceSec` for running, leading to more realistic and achievable race-day targets.
*   **Heart Rate Zone Integration**: Threshold Heart Rate can be used to define personalized heart rate zones. The pacing algorithm can then suggest target heart rate ranges for different segments of the race, especially for run and potentially bike, providing an additional layer of guidance beyond power and pace.
    *   **Impact**: Athletes can cross-reference pace/power with heart rate to ensure they are within sustainable effort levels, particularly useful in variable conditions or when power meters/GPS are unreliable.
*   **VO2 Max for Aerobic Capacity**: VO2 Max can inform the overall intensity and sustainability of the race plan. For athletes with higher VO2 Max, the algorithm might suggest slightly more aggressive pacing strategies, while for those with lower VO2 Max, a more conservative approach might be recommended.
    *   **Impact**: Better alignment of race strategy with an athlete's aerobic fitness, optimizing for performance without risking early burnout.
*   **Advanced Fatigue Modeling with Training Load/Status**: The current run pacing logic incorporates a `fatigueFactor` based on `bikeTss`. With Garmin's Training Load and Training Status, the algorithm can develop a more sophisticated, holistic fatigue model. This can account for cumulative training stress leading up to the race, not just bike leg intensity.
    *   **Impact**: More accurate prediction of run fade and more personalized run pacing adjustments, potentially suggesting a more conservative start to the run if the athlete is entering the race with high cumulative fatigue.

### 8.2 Nutrition and Hydration Calculations

**Current Nutrition Logic (from `apps/web/src/lib/engine/nutrition.ts`):**

*   **Carbohydrates**: Based on `durationHours` (e.g., 60-90g/hr).
*   **Fluid & Sodium**: Based on `temperatureC` and optional `sweatRate`.

**Proposed Improvements with Garmin Data:**

*   **Personalized Sweat Rate and Electrolyte Needs**: While `sweatRate` is currently an optional input, Garmin often provides data that can help estimate an athlete's individual sweat rate and sodium loss. This can be derived from historical activity data, especially in varying temperatures.
    *   **Impact**: More accurate `fluidPerHour` and `sodiumPerHour` recommendations, reducing the risk of dehydration or hyponatremia, particularly in extreme weather conditions.
*   **Heart Rate Variability (HRV) for Recovery-Adjusted Nutrition**: Although not directly available as a single metric, HRV data (which can be inferred from detailed heart rate data from Garmin) can indicate recovery status. If an athlete is under-recovered, the plan might suggest slightly increased carbohydrate intake or more conservative fueling to support recovery during the race.
    *   **Impact**: Nutrition plans that adapt not just to race duration and temperature, but also to the athlete's current physiological state and recovery needs.

### 8.3 AI Prompts (Narrative Generation) Enhancements

**Current Narrative Generation (from `apps/web/src/lib/engine/narrative.ts`):**

*   The prompt includes race details, weather, and basic pacing/nutrition targets. It also incorporates `statisticalInsights` for cohort comparison and fade prediction.

**Proposed Improvements with Garmin Data:**

*   **Richer Athlete Profile for Narrative**: The AI prompt can be augmented with the newly available Garmin metrics to generate a more personalized and insightful narrative.
    *   **Example additions to prompt**: "Your current VO2 Max is [VO2 Max value], indicating strong aerobic capacity.", "Your recent training status is [Training Status], suggesting you are [productive/overreaching/detraining].", "Your threshold heart rate is [Threshold HR], which will be a key indicator of effort on the run."
    *   **Impact**: The generated narrative will feel more tailored to the individual athlete, incorporating their specific physiological strengths and weaknesses, and providing advice that directly references their Garmin data. This can include more specific guidance on when to push based on VO2 Max, or when to hold back based on training status.
*   **Dynamic Race Strategy based on Training Load**: The narrative can explicitly address how the athlete's recent training load might influence their race strategy. For example, if training load is high, the narrative might emphasize conservative pacing early on and focus on efficient movement.
    *   **Impact**: Provides actionable advice that considers the athlete's current state, making the AI coach feel more responsive and intelligent.
*   **Wizard Flow Context**: The narrative can acknowledge the data source, e.g., "Based on your recently synced Garmin data...", reinforcing the value of the integration.

By integrating these advanced Garmin metrics, RaceDayAI can move beyond generic recommendations to truly personalized, data-driven race strategies that adapt to the athlete's unique physiology and training history.
