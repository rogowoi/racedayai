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

## 6. Next Steps

1.  **Finalize Developer Access**: Marc Lussi has provided access; confirm credentials in the Developer Portal.
2.  **OAuth 2.0 PKCE Implementation**: Implement the modern auth flow.
3.  **Webhook Endpoint**: Set up a listener for Garmin push notifications.
4.  **FIT File Parser**: Implement a parser for detailed activity data from FIT files.
5.  **Training API Integration**: Develop the "Push to Watch" feature for race plans.

## References

[1] Garmin Connect Developer Program - Health API: https://developer.garmin.com/gc-developer-program/health-api/
[2] Garmin Connect Developer Program - Activity API: https://developer.garmin.com/gc-developer-program/activity-api/
[3] Garmin Connect Developer Program - OAuth 2.0 PKCE Spec: https://developerportal.garmin.com/sites/default/files/OAuth2PKCE_1.pdf
