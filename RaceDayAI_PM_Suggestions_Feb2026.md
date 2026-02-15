**RaceDayAI**

**10 Strategic Product Suggestions**

*From the Perspective of a Legendary Product Manager & Age-Group
Triathlete*

February 14, 2026

Executive Summary

RaceDayAI has a compelling value proposition and strong marketing copy.
The landing page speaks directly to the age-group triathlete's deepest
fear: blowing up on race day after months of training. The pricing is
accessible, the Strava integration is the right strategic bet, and the
product concept fills a real gap in the market.

However, the product is currently in a \"promise \> delivery\" state.
The landing page sells a rich, AI-powered race execution plan with
gel-by-gel nutrition timing, terrain-adaptive power targets, and
weather-adjusted strategy. The actual plan output is a basic
swim/bike/run summary with single target numbers. This gap is the single
biggest risk to the product: early adopters who feel misled will not
return and will not recommend.

The 10 suggestions below are ordered by strategic priority. Suggestion
\#1 (delivering the advertised plan depth) is a prerequisite for
everything else. Without a product that matches the promise, no amount
of growth tactics, pricing optimization, or feature additions will
matter.

Quick Reference

  -------- ---------------------------------------------------- ------------------------- ------------ -------------- ----------------
  **\#**   **Suggestion**                                       **Category**              **Effort**   **Impact**     **Priority**
  **01**   Deliver the Advertised Race Plan Depth               Core Product              High         **Critical**   **P0 - Now**
  **02**   Add Strava Auto-Import for Fitness Data              Onboarding / Retention    Medium       **High**       **P0 - Now**
  **03**   Build a Race Calendar with Course Database           Growth / Discovery        High         **High**       **P1 - Next**
  **04**   Introduce Post-Race Analysis and Plan Comparison     Retention / Engagement    Medium       **High**       **P1 - Next**
  **05**   Add a Social Proof Layer with Real User Results      Conversion / Trust        Low          **High**       **P1 - Next**
  **06**   Create an Interactive Plan Preview Before Sign-Up    Conversion                Medium       **High**       **P1 - Next**
  **07**   Build Race-Week Countdown with Daily Tips            Engagement / Retention    Medium       **Medium**     **P2 - Later**
  **08**   Offer a Per-Race Purchase Option                     Monetization              Low          **Medium**     **P2 - Later**
  **09**   Add Garmin/Wahoo Workout Export                      Product Differentiation   Medium       **Medium**     **P2 - Later**
  **10**   Implement A/B Testing on the Landing Page CTA Flow   Growth / Optimization     Low          **Medium**     **P2 - Later**
  -------- ---------------------------------------------------- ------------------------- ------------ -------------- ----------------

Detailed Suggestions

**\#01 Deliver the Advertised Race Plan Depth**

**Category:** Core Product **Effort:** High **Impact: Critical**

*The single biggest credibility gap in RaceDayAI right now is the
disconnect between what the landing page promises and what the actual
plan delivers.*

**The Problem**

The homepage sample plan showcases a rich, detailed race execution plan
with nutrition timelines (gel-by-gel schedule at T+0:15, T+0:40,
T+1:05), hydration strategy (500ml/hr bike, 200ml/hr run), heat warnings
with automatic power reduction, hill strategy (210W push, 165W recover),
and AI-powered adjustments. The actual plan a user receives after going
through the wizard shows only basic swim/bike/run splits with a single
target pace or power number. There is no nutrition timeline, no
transition checklist, no weather adjustments, no hill strategy
breakdown. This is the core value proposition failure --- the product
does not yet deliver what it sells.

**The Recommendation**

Prioritize building the full race execution plan output before any other
feature work. The plan detail page should include: (1) a gel-by-gel
nutrition timeline with timing markers, (2) hydration strategy with
volume targets, (3) segment-by-segment bike strategy (flats, hills,
descents), (4) run pacing strategy with negative split guidance, (5)
T1/T2 transition checklists, and (6) a printable race-day card format.
This is the foundation everything else builds on.

**Athlete's Perspective**

*"As an age-grouper, I came to this app because the demo plan looked
incredible --- exactly what I wish my coach would hand me. When I got my
actual plan and it was just three numbers (swim pace, bike power, run
pace), I felt let down. I can get that from any pace calculator for
free."*

**\#02 Add Strava Auto-Import for Fitness Data**

**Category:** Onboarding / Retention **Effort:** Medium **Impact: High**

*Reduce onboarding friction by pulling fitness data directly from Strava
instead of requiring manual input.*

**The Problem**

The sign-up page already offers Strava SSO, but the wizard still
requires manual entry of FTP, threshold pace, body weight, and other
fitness metrics. Most age-group triathletes track their workouts on
Strava but may not know their exact FTP or threshold pace. Asking for
specific numbers creates two problems: (1) friction for users who don't
know these values, and (2) inaccurate inputs from users who guess. The
landing page and pricing tier both reference \"Strava auto-import\" as a
feature, but it does not appear to be functional yet.

**The Recommendation**

Implement Strava API integration to automatically derive fitness metrics
from recent activity data. Pull recent bike rides to estimate FTP from
power data, recent runs to estimate threshold pace from pace/heart rate
data, and body weight from the Strava profile. Show the derived values
in the wizard with an option to override. This transforms the wizard
from a \"fill out this form\" experience into a \"we already know you\"
experience.

**Athlete's Perspective**

*"I have 3 years of Strava data. If this app can look at my last 6
months of training and tell me my current FTP is approximately 230W and
my threshold pace is 4:45/km, I would trust it immediately. Having to
manually enter numbers feels like a step backward."*

**\#03 Build a Race Calendar with Course Database**

**Category:** Growth / Discovery **Effort:** High **Impact: High**

*Create a searchable race database so users can find and select their
target race instead of manually entering race details.*

**The Problem**

Currently, users must know their race details (distance, date, location)
and manually enter them. There is no race database or search
functionality. Popular triathlon platforms like Ironman, Challenge
Family, and local race series have established calendars. Integrating
this data would significantly reduce friction and enable features like
course-specific analysis (elevation profiles, historical weather), which
are key differentiators mentioned in the marketing.

**The Recommendation**

Build a race catalog with data from major organizers (IRONMAN,
Challenge, 70.3 series). Allow users to search by location, distance,
and date. Pre-populate race details including course GPX data, typical
weather conditions, and elevation profiles. This becomes a discovery
tool: athletes browsing races can see \"RaceDayAI has a plan for this
course\" and convert from browsers to users.

**Athlete's Perspective**

*"When I'm picking my next 70.3, I want to know which courses suit my
strengths. If RaceDayAI could show me \"Ironman 70.3 Warsaw: flat bike,
120m elevation gain, average June temp 22°C --- great for your profile\"
that would be a game-changer for race selection, not just race
execution."*

**\#04 Introduce Post-Race Analysis and Plan Comparison**

**Category:** Retention / Engagement **Effort:** Medium **Impact: High**

*Let athletes upload their actual race data and compare performance
against the plan to improve future predictions.*

**The Problem**

RaceDayAI is currently a one-shot tool: create a plan, race, done. There
is no post-race workflow. After the race, athletes want to understand:
Did I follow the plan? Where did I deviate? How accurate was the
prediction? This creates a retention loop --- athletes come back to
analyze and to plan their next race with improved data. Without this,
the app is used once and forgotten.

**The Recommendation**

Add a \"Race Debrief\" feature where users upload their actual race file
(from Garmin, Wahoo, etc.) and the system overlays predicted vs. actual:
power, pace, nutrition timing, heart rate. Show where the athlete
deviated from the plan and the time impact. Feed this data back into the
prediction model for their next race. This turns a single-use tool into
a season-long training companion.

**Athlete's Perspective**

*"After every race, I spend hours in TrainingPeaks comparing my data to
my plan. If RaceDayAI did this automatically and showed me \"You went
15W over target on the first climb and paid for it with a
20-second-per-km fade in the last 5K,\" I'd never cancel my
subscription."*

**\#05 Add a Social Proof Layer with Real User Results**

**Category:** Conversion / Trust **Effort:** Low **Impact: High**

*Replace generic testimonials with verifiable, specific user results to
build trust.*

**The Problem**

The landing page has three testimonials from \"Sarah K.,\" \"Marcus
T.,\" and one other user. These feel generic and unverifiable --- a
common pattern in early-stage products that savvy triathletes will
recognize. The triathlon community is tight-knit and trust-driven.
Athletes rely on real peer recommendations, race reports, and Strava
segments. Generic testimonials do not build credibility with this
audience.

**The Recommendation**

Partner with 10--20 real age-groupers to use RaceDayAI for their next
race. Collect before/after data: predicted time, actual time, plan
adherence. Create detailed case studies with real names, real races, and
real Strava links. Publish these as race reports. Encourage users to
share their RaceDayAI plan results on Strava and in triathlon forums.
Build an \"Athletes\" page showcasing real results.

**Athlete's Perspective**

*"I trust race reports from real people on Slowtwitch or the Ironman
subreddit more than any marketing. If I saw someone post \"RaceDayAI
predicted 5:12 for 70.3 Dubai and I finished 5:15 --- the nutrition
timeline saved me\" with their Strava activity link, I'd sign up
immediately."*

**\#06 Create an Interactive Plan Preview Before Sign-Up**

**Category:** Conversion **Effort:** Medium **Impact: High**

*Let potential users experience the wizard and see a teaser of their
personalized plan before requiring account creation.*

**The Problem**

Currently, the primary CTA (\"Build My Race Plan\") immediately requires
authentication. A new visitor must create an account before seeing any
personalized output. This is a significant conversion barrier. The \"See
a Sample Plan\" button only scrolls to a static demo --- it's not
personalized and doesn't create the \"wow\" moment needed to drive
sign-up.

**The Recommendation**

Allow anonymous users to complete the first 2--3 wizard steps (select
distance, enter basic fitness info) and show a teaser plan: predicted
finish time with confidence level and one highlighted insight (e.g.,
\"Based on your FTP of 220W, you should target 195W on the bike to
protect your run\"). Then gate the full plan (nutrition timeline,
detailed pacing, PDF export) behind sign-up. This gives users a taste of
personalized value before asking for commitment.

**Athlete's Perspective**

*"If I could enter my FTP and see \"you're looking at a 5:30--5:45
finish for this 70.3 based on your data\" before creating an account,
I'd be hooked. Seeing my own numbers changes everything versus a generic
sample."*

**\#07 Build Race-Week Countdown with Daily Tips**

**Category:** Engagement / Retention **Effort:** Medium **Impact:
Medium**

*Extend the product experience beyond plan creation with a race-week
countdown that delivers daily preparation tips.*

**The Problem**

After creating a plan, the user's next interaction with RaceDayAI is
race day itself --- potentially weeks or months later. There's no
engagement loop between plan creation and race day. This is a missed
opportunity to build habit, deliver value, and reduce churn. Race week
is when athletes are most anxious and most receptive to guidance.

**The Recommendation**

Implement a race-week countdown (7 days out) with daily push
notifications or emails: Day 7: Finalize nutrition plan and test
products. Day 5: Check weather forecast update (with auto-adjusted
plan). Day 3: Transition layout and gear checklist. Day 1: Pre-race meal
timing and hydration loading. Race morning: Final plan review with
course map. This keeps the product top-of-mind and delivers real value
during the highest-anxiety period.

**Athlete's Perspective**

*"Race week is when I'm most nervous and most likely to change my plan.
If RaceDayAI sent me a notification saying \"Weather updated: expect
28°C, we've reduced your bike target to 190W and increased sodium to
700mg/hr\" three days before my race, that alone would justify the
subscription."*

**\#08 Offer a Per-Race Purchase Option**

**Category:** Monetization **Effort:** Low **Impact: Medium**

*Add a single-race purchase option alongside the subscription tiers to
capture users who only race 1--2 times per year.*

**The Problem**

Current pricing offers Free (1 plan), Season Pass (\$39/year for 6
plans), and Pro (\$99/year for unlimited). Many age-group triathletes
only do 1--2 races per year. The \$39/year Season Pass feels expensive
for someone doing a single A-race. These users exhaust the free tier and
then face a jump to \$39 for a feature they'll use once more. This
pricing gap loses the \"casual racer\" segment entirely.

**The Recommendation**

Add a per-race option at \$9--12 per plan. This captures the
one-race-per-year athlete who will never subscribe but would happily pay
for a single premium plan with PDF export, weather integration, and the
full feature set. It also serves as a gateway: users who buy one plan
and have a great race experience will upgrade to Season Pass for their
next season.

**Athlete's Perspective**

*"I do one Ironman per year. \$39 for a season pass when I'll only use
one plan feels wrong. But \$10 for a single premium race plan with
everything included? Take my money. If it works well, I'll get the
season pass next year when I'm doing two 70.3s and a full."*

**\#09 Add Garmin/Wahoo Workout Export**

**Category:** Product Differentiation **Effort:** Medium **Impact:
Medium**

*Export race-day targets directly to GPS devices so athletes can follow
the plan on their wrist during the race.*

**The Problem**

Currently, the race plan exists only as a web view and (for paid users)
a PDF. During the race, athletes need to remember their power targets,
pace zones, and nutrition timing. A PDF on paper gets wet, blows away,
or is hard to read while cycling at 35km/h. The real execution layer is
the GPS device on their wrist or bike computer. Exporting structured
workout files (.fit or .zwo) that display real-time targets on Garmin or
Wahoo devices would be a significant differentiator.

**The Recommendation**

Generate .fit workout files that can be loaded onto Garmin watches and
bike computers. The bike segment would show power targets that change
with terrain (e.g., 195W on flats, 210W on climbs, 165W on descents).
The run segment would show target pace zones. Add nutrition alerts as
workout step reminders (e.g., \"Take gel\" every 25 minutes). This makes
RaceDayAI the bridge between plan and execution.

**Athlete's Perspective**

*"If I could load my RaceDayAI plan directly onto my Garmin 955 and see
\"Target: 195W\" on flats and \"Target: 210W\" on the climbs, with gel
reminders popping up every 25 minutes, this would be the single most
useful tool in triathlon. Nobody else does this."*

**\#10 Implement A/B Testing on the Landing Page CTA Flow**

**Category:** Growth / Optimization **Effort:** Low **Impact: Medium**

*The current landing page sends new users to a login page. Test
alternative flows to optimize for sign-up conversion.*

**The Problem**

The primary CTA (\"Build My Race Plan\") sends logged-out users to
/login with \"Welcome back\" messaging. This is a conversion
anti-pattern: the user just arrived and is being told to \"welcome
back.\" The secondary CTA (\"See a Sample Plan\") scrolls to a static
demo that does not feel personalized. Neither CTA creates a compelling
reason to sign up immediately. The landing page is well-designed with
strong copy, but the conversion funnel has friction at the most critical
moment.

**The Recommendation**

Run A/B tests on three variants: (A) Current flow: CTA → login page. (B)
CTA → signup page with \"Create your free plan\" messaging. (C) CTA →
anonymous wizard (2--3 steps) → teaser result → signup gate. Track
sign-up rate and plan creation rate for each variant. Based on similar
SaaS products, variant C typically outperforms by 2--3x because it gives
value before asking for commitment.

**Athlete's Perspective**

*"I was genuinely excited by the landing page copy. \"You trained for
months. Don't race on guesswork\" --- that hits perfectly. But when I
clicked the big orange button and got a login page saying \"Welcome
back,\" I felt confused. I've never been here before. Make it easy for
me to start."*

Final Thoughts

RaceDayAI is solving a real problem that every age-group triathlete
faces: the gap between training fitness and race-day execution. The
market timing is excellent --- power meters and GPS watches have made
data-driven training mainstream, but race-day strategy remains guesswork
for most athletes. The \$39/year price point is compelling and the
product concept has strong word-of-mouth potential in triathlon
communities.

The critical path forward is clear: deliver the depth of plan that the
landing page promises (\#1), make onboarding frictionless with Strava
(\#2), and build the feedback loop that keeps athletes coming back
(\#4). These three investments transform RaceDayAI from a novelty tool
into a season-long companion that athletes recommend to their training
partners.

**The product has the potential to become the default race-day planning
tool for age-group triathletes. But that potential will only be realized
if the first experience matches the promise. Fix the core plan output
first. Everything else follows.**
